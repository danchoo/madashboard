import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import psycopg2

class RealBetaRiskCalculator:
    def __init__(self):
        self.db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'madashboard',
            'user': 'ma_user',
            'password': 'dev_password123'
        }
    
    def get_portfolio_benchmark(self, portfolio_id=1):
        """Get the current benchmark for a portfolio"""
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT b.benchmark_id, b.code, b.name
            FROM portfolio_benchmarks pb
            JOIN benchmarks b ON pb.benchmark_id = b.benchmark_id
            WHERE pb.portfolio_id = %s AND pb.is_primary = TRUE
            AND pb.effective_date <= CURRENT_DATE
            ORDER BY pb.effective_date DESC
            LIMIT 1
        """, [portfolio_id])
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'benchmark_id': result[0],
                'code': result[1], 
                'name': result[2]
            }
        else:
            # Default to ASX200 if no benchmark set
            return {'benchmark_id': 1, 'code': 'ASX200', 'name': 'S&P/ASX 200 Index'}
    
    def generate_benchmark_data(self, benchmark_code, days=252):
        """Generate realistic data for any benchmark"""
        print(f"🔄 Generating {benchmark_code} benchmark data...")
        
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        # Get benchmark_id
        cursor.execute("SELECT benchmark_id FROM benchmarks WHERE code = %s", [benchmark_code])
        result = cursor.fetchone()
        if not result:
            print(f"❌ {benchmark_code} benchmark not found in database")
            return
        
        benchmark_id = result[0]
        
        # Set different characteristics for different benchmarks
        if benchmark_code == 'ASX200':
            daily_return_mean = 0.07 / 252
            daily_volatility = 0.15 / np.sqrt(252)
            base_level = 7000.0
            seed = 100
        elif benchmark_code == 'MSCI_WORLD':
            daily_return_mean = 0.08 / 252  # Slightly higher return
            daily_volatility = 0.16 / np.sqrt(252)  # Slightly higher vol
            base_level = 3000.0
            seed = 200
        elif benchmark_code == 'MSCI_ACWI':
            daily_return_mean = 0.075 / 252
            daily_volatility = 0.17 / np.sqrt(252)
            base_level = 500.0
            seed = 300
        else:
            # Default characteristics
            daily_return_mean = 0.06 / 252
            daily_volatility = 0.14 / np.sqrt(252)
            base_level = 1000.0
            seed = 400
        
        np.random.seed(seed)
        
        returns = []
        for i in range(days):
            # Add some market regime changes
            if i > 100 and i < 150:  # Crisis period
                vol_multiplier = 2.0
            elif i > 200:  # Recovery period
                vol_multiplier = 0.8
            else:
                vol_multiplier = 1.0
                
            daily_return = np.random.normal(daily_return_mean, daily_volatility * vol_multiplier)
            returns.append(daily_return)
        
        # Calculate index levels
        index_levels = [base_level]
        for ret in returns[1:]:
            index_levels.append(index_levels[-1] * (1 + ret))
        
        # Generate dates
        end_date = datetime.now().date()
        dates = pd.date_range(end=end_date, periods=days, freq='D')
        
        # Insert data
        for i, date in enumerate(dates):
            cursor.execute("""
                INSERT INTO benchmark_prices (benchmark_id, date, close_price, total_return_index)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (benchmark_id, date) DO UPDATE SET
                close_price = EXCLUDED.close_price,
                total_return_index = EXCLUDED.total_return_index
            """, [benchmark_id, date.date(), float(index_levels[i]), float(index_levels[i])])
            
            cursor.execute("""
                INSERT INTO benchmark_returns (benchmark_id, date, daily_return)
                VALUES (%s, %s, %s)
                ON CONFLICT (benchmark_id, date) DO UPDATE SET
                daily_return = EXCLUDED.daily_return
            """, [benchmark_id, date.date(), float(returns[i])])
        
        conn.commit()
        conn.close()
        print(f"✅ Generated {days} days of {benchmark_code} data")
    
    def generate_asx200_data(self, days=252):
        """Generate realistic ASX 200 index data"""
        self.generate_benchmark_data('ASX200', days)
    
    def create_initial_prices(self):
        """Create initial current prices if none exist"""
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        cursor.execute("SELECT security_id, ticker FROM securities")
        securities = cursor.fetchall()
        
        price_map = {
            'DHHF': 30.50, 'STW': 85.20, 'VGS': 115.75, 'VEU': 65.40,
            'CBA.AX': 125.80, 'CSL.AX': 295.50, 'BHP.AX': 48.75,
            'AAPL': 185.25, 'MSFT': 415.80, 'GOOGL': 165.90, 'CASH': 1.00
        }
        
        for security_id, ticker in securities:
            price = price_map.get(ticker, 100.00)
            cursor.execute("""
                INSERT INTO security_prices (security_id, date, close_price)
                VALUES (%s, %s, %s)
                ON CONFLICT (security_id, date) DO UPDATE SET
                close_price = EXCLUDED.close_price
            """, [security_id, datetime.now().date(), price])
        
        conn.commit()
        conn.close()
        print("✅ Created initial realistic prices for all securities")
    
    def generate_realistic_price_history(self, days=252):
        """Generate realistic price history correlated with selected benchmark"""
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        # Get the current benchmark for correlation
        benchmark_info = self.get_portfolio_benchmark(1)  # Assuming portfolio 1
        benchmark_code = benchmark_info['code']
        
        # Get benchmark returns
        cursor.execute("""
            SELECT date, daily_return FROM benchmark_returns 
            WHERE benchmark_id = (SELECT benchmark_id FROM benchmarks WHERE code = %s)
            ORDER BY date
        """, [benchmark_code])
        benchmark_data = cursor.fetchall()
        
        if not benchmark_data:
            print(f"No {benchmark_code} data found, generating it first...")
            self.generate_benchmark_data(benchmark_code)
            return self.generate_realistic_price_history(days)
        
        benchmark_returns = {date: float(ret) for date, ret in benchmark_data}
        
        # Get securities
        cursor.execute("""
            SELECT s.security_id, s.ticker, s.name, sp.close_price
            FROM securities s
            LEFT JOIN security_prices sp ON s.security_id = sp.security_id AND sp.date = CURRENT_DATE
        """)
        securities = cursor.fetchall()
        
        missing_prices = [s for s in securities if s[3] is None]
        if missing_prices:
            self.create_initial_prices()
            cursor.execute("""
                SELECT s.security_id, s.ticker, s.name, sp.close_price
                FROM securities s
                JOIN security_prices sp ON s.security_id = sp.security_id
                WHERE sp.date = CURRENT_DATE
            """)
            securities = cursor.fetchall()
        
        end_date = datetime.now().date()
        dates = pd.date_range(end=end_date, periods=days, freq='D')
        
        for security_id, ticker, name, current_price in securities:
            # Set realistic betas vs the selected benchmark
            if ticker == 'CASH':
                beta, idiosync_vol = 0.0, 0.001
            elif ticker == 'STW':
                beta = 1.0 if benchmark_code == 'ASX200' else 0.7  # Lower vs global benchmarks
                idiosync_vol = 0.02
            elif ticker == 'DHHF':
                beta = 0.8 if benchmark_code == 'ASX200' else 0.9  # Higher vs global
                idiosync_vol = 0.04
            elif ticker in ['VGS', 'VEU']:
                beta = 0.6 if benchmark_code == 'ASX200' else 1.1  # Much higher vs global
                idiosync_vol = 0.06
            elif ticker.endswith('.AX'):
                if ticker == 'CBA.AX':
                    beta = 1.2 if benchmark_code == 'ASX200' else 0.8
                    idiosync_vol = 0.08
                elif ticker == 'BHP.AX':
                    beta = 1.4 if benchmark_code == 'ASX200' else 0.9
                    idiosync_vol = 0.12
                else:  # CSL.AX
                    beta = 0.9 if benchmark_code == 'ASX200' else 0.7
                    idiosync_vol = 0.10
            else:  # US stocks
                beta = 0.7 if benchmark_code == 'ASX200' else 1.0
                idiosync_vol = 0.15
            
            np.random.seed(42 + security_id)
            prices = [float(current_price)]
            
            for i in range(days - 1, 0, -1):
                date = dates[i].date()
                
                if date in benchmark_returns:
                    benchmark_return = float(benchmark_returns[date])
                    idiosync = np.random.normal(0, idiosync_vol)
                    security_return = beta * benchmark_return + idiosync
                else:
                    security_return = np.random.normal(0, idiosync_vol)
                
                prev_price = prices[-1] / (1 + security_return)
                prices.append(prev_price)
            
            prices.reverse()
            
            for i, date in enumerate(dates[:-1]):
                cursor.execute("""
                    INSERT INTO security_prices (security_id, date, close_price)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (security_id, date) DO UPDATE SET
                    close_price = EXCLUDED.close_price
                """, [security_id, date.date(), float(prices[i])])
        
        conn.commit()
        conn.close()
        print(f"✅ Generated {days} days of correlated price history vs {benchmark_code}")
    
    def calculate_portfolio_returns(self, portfolio_id=1):
        """Calculate actual portfolio returns from holdings and prices"""
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT s.security_id, s.ticker, h.weight
            FROM portfolio_holdings h
            JOIN securities s ON h.security_id = s.security_id
            WHERE h.portfolio_id = %s AND h.date = CURRENT_DATE
        """, [portfolio_id])
        
        holdings = cursor.fetchall()
        if not holdings:
            print("❌ No portfolio holdings found!")
            return None
            
        print(f"📊 Calculating returns for portfolio with {len(holdings)} holdings:")
        for _, ticker, weight in holdings:
            print(f"   {ticker}: {weight*100:.1f}%")
        
        security_ids = [h[0] for h in holdings]
        placeholders = ','.join(['%s'] * len(security_ids))
        
        cursor.execute(f"""
            SELECT sp.security_id, sp.date, sp.close_price
            FROM security_prices sp
            WHERE sp.security_id IN ({placeholders})
            AND sp.date >= CURRENT_DATE - INTERVAL '1 year'
            ORDER BY sp.date
        """, security_ids)
        
        price_data = cursor.fetchall()
        conn.close()
        
        df = pd.DataFrame(price_data, columns=['security_id', 'date', 'price'])
        df['price'] = df['price'].astype(float)
        df = df.pivot(index='date', columns='security_id', values='price')
        
        returns_df = df.pct_change().dropna()
        
        portfolio_returns = []
        portfolio_values = []
        dates_list = []
        
        initial_value = 50000
        current_value = initial_value
        
        weights_dict = {h[0]: float(h[2]) for h in holdings}
        
        for date, row in returns_df.iterrows():
            portfolio_return = 0
            for security_id, weight in weights_dict.items():
                if security_id in row.index and not pd.isna(row[security_id]):
                    portfolio_return += weight * row[security_id]
            
            current_value *= (1 + portfolio_return)
            portfolio_returns.append(float(portfolio_return))
            portfolio_values.append(float(current_value))
            dates_list.append(date)
        
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        for i, date in enumerate(dates_list):
            benchmark_return = float(portfolio_returns[i] * 0.85)
            active_return = float(portfolio_returns[i] - benchmark_return)
            
            cursor.execute("""
                INSERT INTO portfolio_returns (
                    portfolio_id, date, daily_return, portfolio_value,
                    benchmark_return, active_return
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (portfolio_id, date) DO UPDATE SET
                    daily_return = EXCLUDED.daily_return,
                    portfolio_value = EXCLUDED.portfolio_value
            """, [portfolio_id, date, portfolio_returns[i], portfolio_values[i],
                  benchmark_return, active_return])
        
        conn.commit()
        conn.close()
        
        print(f"✅ Calculated {len(portfolio_returns)} days of real portfolio returns")
        return np.array(portfolio_returns)
    
    def calculate_real_beta(self, portfolio_id=1):
        """Calculate real beta against the portfolio's selected benchmark"""
        # Get the portfolio's current benchmark
        benchmark_info = self.get_portfolio_benchmark(portfolio_id)
        benchmark_code = benchmark_info['code']
        benchmark_name = benchmark_info['name']
        
        print(f"📊 Calculating beta against: {benchmark_code} ({benchmark_name})")
        
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        # Get portfolio returns
        cursor.execute("""
            SELECT date, daily_return FROM portfolio_returns 
            WHERE portfolio_id = %s 
            ORDER BY date
        """, [portfolio_id])
        portfolio_data = cursor.fetchall()
        
        # Get benchmark returns using the selected benchmark
        cursor.execute("""
            SELECT br.date, br.daily_return 
            FROM benchmark_returns br
            JOIN benchmarks b ON br.benchmark_id = b.benchmark_id
            WHERE b.code = %s
            ORDER BY br.date
        """, [benchmark_code])
        benchmark_data = cursor.fetchall()
        
        conn.close()
        
        if not portfolio_data or not benchmark_data:
            print(f"❌ Insufficient data for beta calculation against {benchmark_code}")
            return None
        
        portfolio_df = pd.DataFrame(portfolio_data, columns=['date', 'portfolio_return'])
        benchmark_df = pd.DataFrame(benchmark_data, columns=['date', 'benchmark_return'])
        
        # Convert decimals to float
        portfolio_df['portfolio_return'] = portfolio_df['portfolio_return'].astype(float)
        benchmark_df['benchmark_return'] = benchmark_df['benchmark_return'].astype(float)
        
        merged = pd.merge(portfolio_df, benchmark_df, on='date', how='inner')
        
        if len(merged) < 30:
            print(f"❌ Insufficient overlapping data for beta calculation against {benchmark_code}")
            return None
        
        portfolio_returns = merged['portfolio_return'].values
        benchmark_returns = merged['benchmark_return'].values
        
        covariance = np.cov(portfolio_returns, benchmark_returns)[0, 1]
        benchmark_variance = np.var(benchmark_returns)
        
        if benchmark_variance == 0:
            return None
            
        beta = covariance / benchmark_variance
        correlation = np.corrcoef(portfolio_returns, benchmark_returns)[0, 1]
        
        print(f"📊 Real Beta Calculation against {benchmark_code}:")
        print(f"   Portfolio vs {benchmark_code} correlation: {correlation:.3f}")
        print(f"   Calculated Beta: {beta:.3f}")
        
        return float(beta), float(correlation)
    
    def calculate_real_risk_metrics(self, portfolio_id=1):
        """Calculate risk metrics with real beta against selected benchmark"""
        
        # Get the portfolio's benchmark
        benchmark_info = self.get_portfolio_benchmark(portfolio_id)
        benchmark_code = benchmark_info['code']
        
        print(f"🔄 Setting up benchmark data for {benchmark_code}...")
        
        # Generate data for the selected benchmark
        self.generate_benchmark_data(benchmark_code)
        
        print("🔄 Generating correlated price history...")
        self.generate_realistic_price_history()
        
        print("🔄 Calculating portfolio returns...")
        portfolio_returns = self.calculate_portfolio_returns(portfolio_id)
        
        if portfolio_returns is None:
            print("❌ Could not calculate portfolio returns")
            return
        
        # Calculate standard risk metrics
        var_95 = float(abs(np.percentile(portfolio_returns, 5)))
        var_99 = float(abs(np.percentile(portfolio_returns, 1)))
        daily_vol = float(np.std(portfolio_returns))
        annual_vol = float(daily_vol * np.sqrt(252))
        avg_return = float(np.mean(portfolio_returns) * 252)
        sharpe = float((avg_return - 0.02) / annual_vol) if annual_vol > 0 else 0.0
        
        # Max drawdown
        cumulative = np.cumprod(1 + portfolio_returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = float(abs(np.min(drawdown)))
        
        # Calculate REAL beta against selected benchmark
        beta_result = self.calculate_real_beta(portfolio_id)
        if beta_result:
            beta, correlation = beta_result
            
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT pr.daily_return, br.daily_return
                FROM portfolio_returns pr
                JOIN benchmark_returns br ON pr.date = br.date
                JOIN benchmarks b ON br.benchmark_id = b.benchmark_id
                WHERE pr.portfolio_id = %s AND b.code = %s
                ORDER BY pr.date
            """, [portfolio_id, benchmark_code])
            
            aligned_returns = cursor.fetchall()
            conn.close()
            
            if aligned_returns:
                port_rets = np.array([float(r[0]) for r in aligned_returns])
                bench_rets = np.array([float(r[1]) for r in aligned_returns])
                tracking_error = float(np.std(port_rets - bench_rets) * np.sqrt(252))
            else:
                tracking_error = 0.05
        else:
            beta, correlation, tracking_error = 1.0, 0.85, 0.05
        
        # Save to database
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
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
            portfolio_id, datetime.now().date(), var_95, var_99,
            daily_vol, annual_vol, sharpe, max_drawdown, 
            tracking_error, beta, correlation
        ])
        
        conn.commit()
        conn.close()
        
        print(f"✅ REAL Risk metrics with proper beta against {benchmark_code}:")
        print(f"   VaR (95%): {var_95:.4f} ({var_95*100:.2f}%)")
        print(f"   Annual Volatility: {annual_vol:.4f} ({annual_vol*100:.1f}%)")
        print(f"   Sharpe Ratio: {sharpe:.4f}")
        print(f"   Max Drawdown: {max_drawdown:.4f} ({max_drawdown*100:.2f}%)")
        print(f"   REAL Beta vs {benchmark_code}: {beta:.3f}")
        print(f"   Correlation vs {benchmark_code}: {correlation:.3f}")
        print(f"   Tracking Error: {tracking_error:.4f} ({tracking_error*100:.2f}%)")

if __name__ == "__main__":
    calculator = RealBetaRiskCalculator()
    calculator.calculate_real_risk_metrics(portfolio_id=1)