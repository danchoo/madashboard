import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import psycopg2

class SimpleRiskCalculator:
    def __init__(self):
        self.db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'madashboard',
            'user': 'ma_user',
            'password': 'dev_password123'
        }
    
    def generate_sample_returns(self, portfolio_id=1, days=252):
        """Generate sample returns for testing"""
        np.random.seed(42)  # Reproducible results
        
        # Generate realistic daily returns
        daily_returns = np.random.normal(0.0008, 0.015, days)  # ~20% annual vol
        benchmark_returns = np.random.normal(0.0005, 0.012, days)  # Benchmark
        
        # Calculate portfolio values starting from $50,000
        portfolio_values = [50000.0]
        for ret in daily_returns[1:]:
            portfolio_values.append(portfolio_values[-1] * (1 + ret))
        
        # Create date range
        end_date = datetime.now().date()
        dates = pd.date_range(end=end_date, periods=days, freq='D')
        
        # Save to database
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        for i, date in enumerate(dates):
            try:
                cursor.execute("""
                    INSERT INTO portfolio_returns (
                        portfolio_id, date, daily_return, portfolio_value, 
                        benchmark_return, active_return
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (portfolio_id, date) DO NOTHING
                """, [
                    portfolio_id, 
                    date.date(), 
                    float(daily_returns[i]),  # Convert numpy float to Python float
                    float(portfolio_values[i]), 
                    float(benchmark_returns[i]), 
                    float(daily_returns[i] - benchmark_returns[i])
                ])
            except Exception as e:
                print(f"Error inserting row {i}: {e}")
                continue
        
        conn.commit()
        conn.close()
        print(f"✅ Generated {days} days of sample returns")
        
        return daily_returns
    
    def calculate_risk_metrics(self, portfolio_id=1):
        """Calculate basic risk metrics"""
        # Get returns from database
        conn = psycopg2.connect(**self.db_config)
        
        try:
            # Use simple query without pandas warnings
            cursor = conn.cursor()
            cursor.execute("""
                SELECT daily_return, benchmark_return 
                FROM portfolio_returns 
                WHERE portfolio_id = %s 
                ORDER BY date DESC 
                LIMIT 252
            """, [portfolio_id])
            
            rows = cursor.fetchall()
            
            if len(rows) == 0:
                print("No returns found, generating sample data...")
                cursor.close()
                conn.close()
                self.generate_sample_returns(portfolio_id)
                return self.calculate_risk_metrics(portfolio_id)
            
            # Convert to numpy arrays
            returns = np.array([float(row[0]) for row in rows])
            benchmark_returns = np.array([float(row[1]) for row in rows if row[1] is not None])
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            print(f"Error fetching data: {e}")
            conn.close()
            return
        
        # Calculate basic metrics
        var_95 = float(abs(np.percentile(returns, 5)))  # VaR at 95%
        var_99 = float(abs(np.percentile(returns, 1)))  # VaR at 99%
        
        daily_vol = float(np.std(returns))
        annual_vol = float(daily_vol * np.sqrt(252))
        
        # Sharpe ratio (assuming 2% risk-free rate)
        avg_return = float(np.mean(returns) * 252)
        sharpe = float((avg_return - 0.02) / annual_vol) if annual_vol > 0 else 0.0
        
        # Max drawdown
        cumulative = np.cumprod(1 + returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = float(abs(np.min(drawdown)))
        
        # Beta and tracking error
        if len(benchmark_returns) > 0 and len(benchmark_returns) == len(returns):
            beta = float(np.cov(returns, benchmark_returns)[0,1] / np.var(benchmark_returns))
            tracking_error = float(np.std(returns - benchmark_returns) * np.sqrt(252))
            correlation = float(np.corrcoef(returns, benchmark_returns)[0,1])
        else:
            beta, tracking_error, correlation = 1.0, 0.0, 1.0
        
        # Save to database
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO portfolio_risk_calculations (
                    portfolio_id, calculation_date, var_1d_95, var_1d_99,
                    daily_volatility, annualized_volatility, sharpe_ratio,
                    max_drawdown, tracking_error, beta, correlation
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (portfolio_id, calculation_date, calculation_method)
                DO UPDATE SET
                    var_1d_95 = EXCLUDED.var_1d_95,
                    var_1d_99 = EXCLUDED.var_1d_99,
                    daily_volatility = EXCLUDED.daily_volatility,
                    annualized_volatility = EXCLUDED.annualized_volatility,
                    sharpe_ratio = EXCLUDED.sharpe_ratio,
                    max_drawdown = EXCLUDED.max_drawdown,
                    tracking_error = EXCLUDED.tracking_error,
                    beta = EXCLUDED.beta,
                    correlation = EXCLUDED.correlation
            """, [
                portfolio_id, 
                datetime.now().date(), 
                var_95, 
                var_99,
                daily_vol, 
                annual_vol, 
                sharpe, 
                max_drawdown, 
                tracking_error, 
                beta, 
                correlation
            ])
            
            conn.commit()
            print(f"✅ Risk metrics calculated and saved:")
            print(f"   VaR (95%): {var_95:.4f} ({var_95*100:.2f}%)")
            print(f"   VaR (99%): {var_99:.4f} ({var_99*100:.2f}%)")
            print(f"   Daily Volatility: {daily_vol:.4f}")
            print(f"   Annual Volatility: {annual_vol:.4f} ({annual_vol*100:.1f}%)")
            print(f"   Sharpe Ratio: {sharpe:.4f}")
            print(f"   Max Drawdown: {max_drawdown:.4f} ({max_drawdown*100:.2f}%)")
            print(f"   Beta: {beta:.4f}")
            print(f"   Tracking Error: {tracking_error:.4f}")
            
        except Exception as e:
            print(f"Error saving risk metrics: {e}")
        finally:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    print("🔄 Starting risk calculation for DHHF Portfolio...")
    calculator = SimpleRiskCalculator()
    calculator.calculate_risk_metrics(portfolio_id=1)
    print("\n🎉 Risk calculation completed!")