import psycopg2

db_config = {
    'host': 'localhost',
    'port': 5432,
    'database': 'madashboard',
    'user': 'ma_user',
    'password': 'dev_password123'
}

def populate_data_quality_table():
    conn = psycopg2.connect(**db_config)
    cursor = conn.cursor()
    
    print("Populating data quality status table...")
    
    try:
        # Clear existing data
        cursor.execute("DELETE FROM data_quality_status")
        conn.commit()
        
        # Get all securities and their data quality
        print("\n📊 Processing Securities:")
        cursor.execute("""
            SELECT s.security_id, s.ticker, s.name,
                   COUNT(sp.*) as total_records,
                   SUM(CASE WHEN sp.data_source = 'yfinance' THEN 1 ELSE 0 END) as real_records,
                   SUM(CASE WHEN sp.data_source != 'yfinance' OR sp.data_source IS NULL THEN 1 ELSE 0 END) as synthetic_records,
                   MIN(CASE WHEN sp.data_source = 'yfinance' THEN sp.date END) as first_real_date,
                   MAX(CASE WHEN sp.data_source = 'yfinance' THEN sp.date END) as last_real_date
            FROM securities s
            LEFT JOIN security_prices sp ON s.security_id = sp.security_id
            GROUP BY s.security_id, s.ticker, s.name
            ORDER BY s.ticker
        """)
        
        securities_data = cursor.fetchall()
        
        for row in securities_data:
            security_id, ticker, name, total_records, real_records, synthetic_records, first_real, last_real = row
            
            # Calculate quality score
            quality_score = real_records / total_records if total_records > 0 else 0
            
            # Determine primary data source
            primary_source = 'yfinance' if real_records > synthetic_records else 'synthetic'
            
            cursor.execute("""
                INSERT INTO data_quality_status (
                    entity_type, entity_id, data_source, first_real_date, last_real_date,
                    total_records, real_records, synthetic_records, data_quality_score
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, [
                'security', security_id, primary_source, first_real, last_real,
                total_records or 0, real_records or 0, synthetic_records or 0, quality_score
            ])
            
            print(f"  {ticker:<12} {primary_source:<10} {quality_score:.1%} quality ({real_records}/{total_records} real)")
        
        # Get all benchmarks and their data quality
        print("\n📈 Processing Benchmarks:")
        cursor.execute("""
            SELECT b.benchmark_id, b.code, b.name,
                   COUNT(bp.*) as total_records,
                   SUM(CASE WHEN bp.data_source = 'yfinance' THEN 1 ELSE 0 END) as real_records,
                   SUM(CASE WHEN bp.data_source != 'yfinance' OR bp.data_source IS NULL THEN 1 ELSE 0 END) as synthetic_records,
                   MIN(CASE WHEN bp.data_source = 'yfinance' THEN bp.date END) as first_real_date,
                   MAX(CASE WHEN bp.data_source = 'yfinance' THEN bp.date END) as last_real_date
            FROM benchmarks b
            LEFT JOIN benchmark_prices bp ON b.benchmark_id = bp.benchmark_id
            GROUP BY b.benchmark_id, b.code, b.name
            ORDER BY b.code
        """)
        
        benchmarks_data = cursor.fetchall()
        
        for row in benchmarks_data:
            benchmark_id, code, name, total_records, real_records, synthetic_records, first_real, last_real = row
            
            quality_score = real_records / total_records if total_records > 0 else 0
            primary_source = 'yfinance' if real_records > synthetic_records else 'synthetic'
            
            cursor.execute("""
                INSERT INTO data_quality_status (
                    entity_type, entity_id, data_source, first_real_date, last_real_date,
                    total_records, real_records, synthetic_records, data_quality_score
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, [
                'benchmark', benchmark_id, primary_source, first_real, last_real,
                total_records or 0, real_records or 0, synthetic_records or 0, quality_score
            ])
            
            print(f"  {code:<12} {primary_source:<10} {quality_score:.1%} quality ({real_records}/{total_records} real)")
        
        # Show summary
        print("\n📊 SUMMARY:")
        cursor.execute("""
            SELECT 
                entity_type,
                COUNT(*) as total_entities,
                SUM(CASE WHEN data_source = 'yfinance' THEN 1 ELSE 0 END) as real_data_entities,
                AVG(data_quality_score) as avg_quality_score
            FROM data_quality_status
            GROUP BY entity_type
        """)
        
        for entity_type, total, real_entities, avg_score in cursor.fetchall():
            print(f"  {entity_type.capitalize()}s: {real_entities}/{total} with real data (avg quality: {avg_score:.1%})")
        
        conn.commit()
        print("\n✅ Data quality status table populated successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    populate_data_quality_table()