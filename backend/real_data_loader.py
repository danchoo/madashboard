import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import time

class RealDataLoader:
    def __init__(self):
        self.db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'madashboard',
            'user': 'ma_user',
            'password': 'dev_password123'
        }
        
        # All tickers we need to fetch
        self.securities_map = {
            'DHHF.AX': {'name': 'BetaShares Diversified High Growth ETF', 'security_id': 1},
            'STW.AX': {'name': 'SPDR S&P ASX 200 ETF', 'security_id': 2}, 
            'VEU': {'name': 'Vanguard FTSE Developed Markets ETF', 'security_id': 3},
            'VGS.AX': {'name': 'Vanguard MSCI Index International Shares ETF', 'security_id': 4},
            'CBA.AX': {'name': 'Commonwealth Bank of Australia', 'security_id': 5},
            'CSL.AX': {'name': 'CSL Limited', 'security_id': 6},
            'BHP.AX': {'name': 'BHP Group Limited', 'security_id': 7},
            'AAPL': {'name': 'Apple Inc', 'security_id': 8},
            'MSFT': {'name': 'Microsoft Corp', 'security_id': 9},
            'GOOGL': {'name': 'Alphabet Inc', 'security_id': 10},
        }
        
        self.benchmarks_map = {
            '^AXJO': {'name': 'ASX 200 Index', 'code': 'ASX200', 'benchmark_id': 1},
            '^AXKO': {'name': 'ASX 300 Index', 'code': 'ASX300', 'benchmark_id': 4},
            'URTH': {'name': 'MSCI World ETF', 'code': 'MSCI_WORLD', 'benchmark_id': 2},
            'ACWI': {'name': 'MSCI ACWI ETF', 'code': 'MSCI_ACWI', 'benchmark_id': 3},
        }
        
        self.start_date = '2020-01-01'
        
    def get_last_price_date(self, security_id):
        """Get the last date we have price data for a security"""
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT MAX(date) FROM security_prices 
            WHERE security_id = %s
        """, [security_id])
        
        result = cursor.fetchone()
        conn.close()
        
        return result[0] if result[0] else datetime.strptime(self.start_date, '%Y-%m-%d').date()
    
    def get_last_benchmark_date(self, benchmark_id):
        """Get the last date we have benchmark data"""
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT MAX(date) FROM benchmark_prices 
            WHERE benchmark_id = %s
        """, [benchmark_id])
        
        result = cursor.fetchone()
        conn.close()
        
        return result[0] if result[0] else datetime.strptime(self.start_date, '%Y-%m-%d').date()
    
    def fetch_security_data(self, ticker, start_date, end_date=None):
        """Fetch data for a single security"""
        if end_date is None:
            end_date = datetime.now().strftime('%Y-%m-%d')
            
        print(f"Fetching {ticker} from {start_date} to {end_date}...")
        
        try:
            # Fetch data from yfinance
            stock = yf.Ticker(ticker)
            hist = stock.history(start=start_date, end=end_date)
            
            if hist.empty:
                print(f"Warning: No data found for {ticker}")
                return None
                
            # Clean and prepare data
            hist = hist.dropna()
            hist['Ticker'] = ticker
            
            return hist
            
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            return None
    
    def store_security_prices(self, ticker, data, security_id):
        """Store security price data in database"""
        if data is None or data.empty:
            return
            
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        records_inserted = 0
        
        for date, row in data.iterrows():
            try:
                cursor.execute("""
                    INSERT INTO security_prices (security_id, date, close_price, data_source)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (security_id, date) 
                    DO UPDATE SET 
                        close_price = EXCLUDED.close_price,
                        data_source = EXCLUDED.data_source
                """, [
                    security_id,
                    date.date(),
                    float(row['Close']),
                    'yfinance'
                ])
                records_inserted += 1
                
            except Exception as e:
                print(f"Error inserting {ticker} data for {date}: {e}")
                
        conn.commit()
        conn.close()
        
        print(f"Stored {records_inserted} price records for {ticker}")
    
    def store_benchmark_data(self, ticker, data, benchmark_id):
        """Store benchmark data in database"""
        if data is None or data.empty:
            return
            
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        records_inserted = 0
        prev_close = None
        
        for date, row in data.iterrows():
            try:
                close_price = float(row['Close'])
                
                # Calculate daily return
                daily_return = 0.0
                if prev_close is not None:
                    daily_return = (close_price - prev_close) / prev_close
                
                # Insert price
                cursor.execute("""
                    INSERT INTO benchmark_prices (benchmark_id, date, close_price, total_return_index, data_source)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (benchmark_id, date) 
                    DO UPDATE SET 
                        close_price = EXCLUDED.close_price,
                        total_return_index = EXCLUDED.total_return_index,
                        data_source = EXCLUDED.data_source
                """, [
                    benchmark_id,
                    date.date(),
                    close_price,
                    close_price,  # Using close as total return index
                    'yfinance'
                ])
                
                # Insert return (skip first day)
                if prev_close is not None:
                    cursor.execute("""
                        INSERT INTO benchmark_returns (benchmark_id, date, daily_return)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (benchmark_id, date)
                        DO UPDATE SET daily_return = EXCLUDED.daily_return
                    """, [benchmark_id, date.date(), daily_return])
                
                prev_close = close_price
                records_inserted += 1
                
            except Exception as e:
                print(f"Error inserting benchmark data for {date}: {e}")
                
        conn.commit()
        conn.close()
        
        print(f"Stored {records_inserted} benchmark records for {ticker}")
    
    def initial_backfill(self):
        """Load all historical data from 2020-01-01"""
        print("🚀 Starting initial backfill of real market data...")
        print(f"Date range: {self.start_date} to present")
        
        # Fetch all securities
        print("\n📊 Fetching Securities Data:")
        for ticker, info in self.securities_map.items():
            data = self.fetch_security_data(ticker, self.start_date)
            self.store_security_prices(ticker, data, info['security_id'])
            time.sleep(0.5)  # Be nice to Yahoo Finance
        
        # Fetch all benchmarks  
        print("\n📈 Fetching Benchmark Data:")
        for ticker, info in self.benchmarks_map.items():
            data = self.fetch_security_data(ticker, self.start_date)
            self.store_benchmark_data(ticker, data, info['benchmark_id'])
            time.sleep(0.5)
            
        print("\n✅ Initial backfill complete!")
        self.show_data_summary()
    
    def incremental_update(self):
        """Update with any missing recent data"""
        print("🔄 Running incremental update...")
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Update securities
        for ticker, info in self.securities_map.items():
            last_date = self.get_last_price_date(info['security_id'])
            
            # Get data since last date
            start_date = (last_date + timedelta(days=1)).strftime('%Y-%m-%d')
            
            if start_date <= today:
                print(f"Updating {ticker} from {start_date}...")
                data = self.fetch_security_data(ticker, start_date, today)
                self.store_security_prices(ticker, data, info['security_id'])
            else:
                print(f"{ticker} is up to date")
                
            time.sleep(0.5)
        
        # Update benchmarks
        for ticker, info in self.benchmarks_map.items():
            last_date = self.get_last_benchmark_date(info['benchmark_id'])
            start_date = (last_date + timedelta(days=1)).strftime('%Y-%m-%d')
            
            if start_date <= today:
                print(f"Updating benchmark {ticker} from {start_date}...")
                data = self.fetch_security_data(ticker, start_date, today)
                self.store_benchmark_data(ticker, data, info['benchmark_id'])
            else:
                print(f"Benchmark {ticker} is up to date")
                
            time.sleep(0.5)
        
        print("✅ Incremental update complete!")

def update_data_quality_status(self):
    """Update data quality tracking for all entities"""
    print("📊 Updating data quality status...")
    
    conn = psycopg2.connect(**self.db_config)
    cursor = conn.cursor()
    
    # Update securities data quality
    for ticker, info in self.securities_map.items():
        security_id = info['security_id']
        
        # Get data statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                SUM(CASE WHEN data_source = 'yfinance' THEN 1 ELSE 0 END) as real_records,
                SUM(CASE WHEN data_source != 'yfinance' THEN 1 ELSE 0 END) as synthetic_records,
                MIN(CASE WHEN data_source = 'yfinance' THEN date END) as first_real_date,
                MAX(CASE WHEN data_source = 'yfinance' THEN date END) as last_real_date
            FROM security_prices 
            WHERE security_id = %s
        """, [security_id])
        
        stats = cursor.fetchone()
        if stats and stats[0] > 0:
            total_records, real_records, synthetic_records, first_real, last_real = stats
            
            # Calculate quality score (percentage of real data)
            quality_score = real_records / total_records if total_records > 0 else 0
            
            # Determine primary data source
            data_source = 'yfinance' if real_records > synthetic_records else 'synthetic'
            
            # Upsert data quality status
            cursor.execute("""
                INSERT INTO data_quality_status (
                    entity_type, entity_id, data_source, first_real_date, last_real_date,
                    total_records, real_records, synthetic_records, data_quality_score
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (entity_type, entity_id) 
                DO UPDATE SET
                    data_source = EXCLUDED.data_source,
                    first_real_date = EXCLUDED.first_real_date,
                    last_real_date = EXCLUDED.last_real_date,
                    total_records = EXCLUDED.total_records,
                    real_records = EXCLUDED.real_records,
                    synthetic_records = EXCLUDED.synthetic_records,
                    data_quality_score = EXCLUDED.data_quality_score,
                    last_updated = CURRENT_TIMESTAMP
            """, [
                'security', security_id, data_source, first_real, last_real,
                total_records, real_records, synthetic_records, quality_score
            ])
    
    # Update benchmarks data quality
    for ticker, info in self.benchmarks_map.items():
        benchmark_id = info['benchmark_id']
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                SUM(CASE WHEN data_source = 'yfinance' THEN 1 ELSE 0 END) as real_records,
                SUM(CASE WHEN data_source != 'yfinance' THEN 1 ELSE 0 END) as synthetic_records,
                MIN(CASE WHEN data_source = 'yfinance' THEN date END) as first_real_date,
                MAX(CASE WHEN data_source = 'yfinance' THEN date END) as last_real_date
            FROM benchmark_prices 
            WHERE benchmark_id = %s
        """, [benchmark_id])
        
        stats = cursor.fetchone()
        if stats and stats[0] > 0:
            total_records, real_records, synthetic_records, first_real, last_real = stats
            quality_score = real_records / total_records if total_records > 0 else 0
            data_source = 'yfinance' if real_records > synthetic_records else 'synthetic'
            
            cursor.execute("""
                INSERT INTO data_quality_status (
                    entity_type, entity_id, data_source, first_real_date, last_real_date,
                    total_records, real_records, synthetic_records, data_quality_score
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (entity_type, entity_id)
                DO UPDATE SET
                    data_source = EXCLUDED.data_source,
                    first_real_date = EXCLUDED.first_real_date,
                    last_real_date = EXCLUDED.last_real_date,
                    total_records = EXCLUDED.total_records,
                    real_records = EXCLUDED.real_records,
                    synthetic_records = EXCLUDED.synthetic_records,
                    data_quality_score = EXCLUDED.data_quality_score,
                    last_updated = CURRENT_TIMESTAMP
            """, [
                'benchmark', benchmark_id, data_source, first_real, last_real,
                total_records, real_records, synthetic_records, quality_score
            ])
    
    conn.commit()
    conn.close()
    
    print("✅ Data quality status updated")
    
def show_data_quality_report(self):
    """Show comprehensive data quality report"""
    conn = psycopg2.connect(**self.db_config)
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM v_data_quality_overview ORDER BY entity_type, identifier")
    results = cursor.fetchall()
    
    print("\n📊 DATA QUALITY REPORT")
    print("=" * 80)
    print(f"{'Type':<10} {'Ticker':<12} {'Name':<25} {'Source':<10} {'Quality':<10} {'Score':<6}")
    print("-" * 80)
    
    for row in results:
        entity_type, entity_id, identifier, name, data_source, first_real, last_real, total, real, synthetic, score, rating, data_type = row
        
        # Color coding for terminal output
        quality_icon = {
            'Excellent': '🟢',
            'Good': '🟡', 
            'Fair': '🟠',
            'Poor': '🔴'
        }.get(rating, '⚪')
        
        data_icon = '📊' if data_type == 'Real Data' else '🔧'
        
        print(f"{entity_type:<10} {identifier:<12} {name[:24]:<25} {data_source:<10} {quality_icon} {rating:<8} {score:.2f}")
    
    conn.close()


    def show_data_summary(self):
        """Show summary of data in database"""
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        # Security prices summary
        cursor.execute("""
            SELECT s.ticker, s.name, 
                   MIN(sp.date) as first_date,
                   MAX(sp.date) as last_date,
                   COUNT(*) as record_count
            FROM security_prices sp
            JOIN securities s ON sp.security_id = s.security_id
            WHERE sp.data_source = 'yfinance'
            GROUP BY s.security_id, s.ticker, s.name
            ORDER BY s.ticker
        """)
        
        print("\n📊 Securities Data Summary:")
        print(f"{'Ticker':<10} {'First Date':<12} {'Last Date':<12} {'Records':<8}")
        print("-" * 50)
        
        for row in cursor.fetchall():
            print(f"{row[0]:<10} {row[2]:<12} {row[3]:<12} {row[4]:<8}")
        
        # Benchmark summary
        cursor.execute("""
            SELECT b.code, b.name,
                   MIN(bp.date) as first_date,
                   MAX(bp.date) as last_date,
                   COUNT(*) as record_count
            FROM benchmark_prices bp
            JOIN benchmarks b ON bp.benchmark_id = b.benchmark_id
            WHERE bp.data_source = 'yfinance'
            GROUP BY b.benchmark_id, b.code, b.name
            ORDER BY b.code
        """)
        
        print("\n📈 Benchmarks Data Summary:")
        print(f"{'Code':<12} {'First Date':<12} {'Last Date':<12} {'Records':<8}")
        print("-" * 50)
        
        for row in cursor.fetchall():
            print(f"{row[0]:<12} {row[2]:<12} {row[3]:<12} {row[4]:<8}")
        
        conn.close()

def update_data_quality_status(self):
        """Update data quality tracking for all entities"""
        print("📊 Updating data quality status...")
        
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        # Update securities data quality
        for ticker, info in self.securities_map.items():
            security_id = info['security_id']
            
            # Get data statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_records,
                    SUM(CASE WHEN data_source = 'yfinance' THEN 1 ELSE 0 END) as real_records,
                    SUM(CASE WHEN data_source != 'yfinance' THEN 1 ELSE 0 END) as synthetic_records,
                    MIN(CASE WHEN data_source = 'yfinance' THEN date END) as first_real_date,
                    MAX(CASE WHEN data_source = 'yfinance' THEN date END) as last_real_date
                FROM security_prices 
                WHERE security_id = %s
            """, [security_id])
            
            stats = cursor.fetchone()
            if stats and stats[0] > 0:
                total_records, real_records, synthetic_records, first_real, last_real = stats
                
                # Calculate quality score (percentage of real data)
                quality_score = real_records / total_records if total_records > 0 else 0
                
                # Determine primary data source
                data_source = 'yfinance' if real_records > synthetic_records else 'synthetic'
                
                # Upsert data quality status
                cursor.execute("""
                    INSERT INTO data_quality_status (
                        entity_type, entity_id, data_source, first_real_date, last_real_date,
                        total_records, real_records, synthetic_records, data_quality_score
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (entity_type, entity_id) 
                    DO UPDATE SET
                        data_source = EXCLUDED.data_source,
                        first_real_date = EXCLUDED.first_real_date,
                        last_real_date = EXCLUDED.last_real_date,
                        total_records = EXCLUDED.total_records,
                        real_records = EXCLUDED.real_records,
                        synthetic_records = EXCLUDED.synthetic_records,
                        data_quality_score = EXCLUDED.data_quality_score,
                        last_updated = CURRENT_TIMESTAMP
                """, [
                    'security', security_id, data_source, first_real, last_real,
                    total_records, real_records, synthetic_records, quality_score
                ])
        
        # Update benchmarks data quality
        for ticker, info in self.benchmarks_map.items():
            benchmark_id = info['benchmark_id']
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_records,
                    SUM(CASE WHEN data_source = 'yfinance' THEN 1 ELSE 0 END) as real_records,
                    SUM(CASE WHEN data_source != 'yfinance' THEN 1 ELSE 0 END) as synthetic_records,
                    MIN(CASE WHEN data_source = 'yfinance' THEN date END) as first_real_date,
                    MAX(CASE WHEN data_source = 'yfinance' THEN date END) as last_real_date
                FROM benchmark_prices 
                WHERE benchmark_id = %s
            """, [benchmark_id])
            
            stats = cursor.fetchone()
            if stats and stats[0] > 0:
                total_records, real_records, synthetic_records, first_real, last_real = stats
                quality_score = real_records / total_records if total_records > 0 else 0
                data_source = 'yfinance' if real_records > synthetic_records else 'synthetic'
                
                cursor.execute("""
                    INSERT INTO data_quality_status (
                        entity_type, entity_id, data_source, first_real_date, last_real_date,
                        total_records, real_records, synthetic_records, data_quality_score
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (entity_type, entity_id)
                    DO UPDATE SET
                        data_source = EXCLUDED.data_source,
                        first_real_date = EXCLUDED.first_real_date,
                        last_real_date = EXCLUDED.last_real_date,
                        total_records = EXCLUDED.total_records,
                        real_records = EXCLUDED.real_records,
                        synthetic_records = EXCLUDED.synthetic_records,
                        data_quality_score = EXCLUDED.data_quality_score,
                        last_updated = CURRENT_TIMESTAMP
                """, [
                    'benchmark', benchmark_id, data_source, first_real, last_real,
                    total_records, real_records, synthetic_records, quality_score
                ])
        
        conn.commit()
        conn.close()
        
        print("✅ Data quality status updated")

def show_data_quality_report(self):
    """Show comprehensive data quality report"""
    conn = psycopg2.connect(**self.db_config)
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM v_data_quality_overview ORDER BY entity_type, identifier")
    results = cursor.fetchall()
    
    print("\n📊 DATA QUALITY REPORT")
    print("=" * 80)
    print(f"{'Type':<10} {'Ticker':<12} {'Name':<25} {'Source':<10} {'Quality':<10} {'Score':<6}")
    print("-" * 80)
    
    for row in results:
        entity_type, entity_id, identifier, name, data_source, first_real, last_real, total, real, synthetic, score, rating, data_type = row
        
        # Simple text indicators for Windows
        quality_icon = {
            'Excellent': '[EXCELLENT]',
            'Good': '[GOOD]', 
            'Fair': '[FAIR]',
            'Poor': '[POOR]'
        }.get(rating, '[UNKNOWN]')
        
        data_icon = '[REAL]' if data_type == 'Real Data' else '[SYNTHETIC]'
        
        print(f"{entity_type:<10} {identifier:<12} {name[:24]:<25} {data_source:<10} {quality_icon:<12} {score:.2f}")
    
    conn.close()

if __name__ == "__main__":
    loader = RealDataLoader()
    
    # Run initial backfill
    loader.initial_backfill()
    
    # Show summary
    loader.show_data_summary()