import psycopg2

# Database connection
db_config = {
    'host': 'localhost',
    'port': 5432,
    'database': 'madashboard',
    'user': 'ma_user',
    'password': 'dev_password123'
}

def simple_data_quality_check():
    conn = psycopg2.connect(**db_config)
    cursor = conn.cursor()
    
    # Check what data sources we have
    print("📊 SECURITIES DATA SOURCES:")
    cursor.execute("""
        SELECT s.ticker, s.name,
               sp.data_source,
               COUNT(*) as records,
               MIN(sp.date) as first_date,
               MAX(sp.date) as last_date
        FROM security_prices sp
        JOIN securities s ON sp.security_id = s.security_id
        GROUP BY s.security_id, s.ticker, s.name, sp.data_source
        ORDER BY s.ticker, sp.data_source
    """)
    
    print(f"{'Ticker':<12} {'Name':<25} {'Source':<10} {'Records':<8} {'First':<12} {'Last':<12}")
    print("-" * 85)
    
    for row in cursor.fetchall():
        ticker, name, source, records, first_date, last_date = row
        print(f"{ticker:<12} {name[:24]:<25} {source:<10} {records:<8} {first_date:<12} {last_date:<12}")
    
    print("\n📈 BENCHMARK DATA SOURCES:")
    cursor.execute("""
        SELECT b.code, b.name,
               bp.data_source,
               COUNT(*) as records,
               MIN(bp.date) as first_date,
               MAX(bp.date) as last_date
        FROM benchmark_prices bp
        JOIN benchmarks b ON bp.benchmark_id = b.benchmark_id
        GROUP BY b.benchmark_id, b.code, b.name, bp.data_source
        ORDER BY b.code, bp.data_source
    """)
    
    print(f"{'Code':<12} {'Name':<25} {'Source':<10} {'Records':<8} {'First':<12} {'Last':<12}")
    print("-" * 85)
    
    for row in cursor.fetchall():
        code, name, source, records, first_date, last_date = row
        print(f"{code:<12} {name[:24]:<25} {source:<10} {records:<8} {first_date:<12} {last_date:<12}")
    
    # Portfolio quality summary
    print("\n🎯 PORTFOLIO DATA QUALITY:")
    cursor.execute("""
        SELECT s.ticker, 
               h.weight,
               sp.data_source,
               COUNT(sp.*) as records
        FROM portfolio_holdings h
        JOIN securities s ON h.security_id = s.security_id
        LEFT JOIN security_prices sp ON s.security_id = sp.security_id
        WHERE h.portfolio_id = 1 AND h.date = CURRENT_DATE
        GROUP BY s.security_id, s.ticker, h.weight, sp.data_source
        ORDER BY h.weight DESC
    """)
    
    print(f"{'Ticker':<12} {'Weight':<8} {'Source':<10} {'Records':<8} {'Status':<12}")
    print("-" * 55)
    
    real_weight = 0
    synthetic_weight = 0
    
    for row in cursor.fetchall():
        ticker, weight, source, records = row
        weight_pct = float(weight) * 100 if weight else 0
        status = "REAL DATA" if source == 'yfinance' else "SYNTHETIC"
        
        if source == 'yfinance':
            real_weight += weight_pct
        else:
            synthetic_weight += weight_pct
            
        print(f"{ticker:<12} {weight_pct:>6.1f}% {source:<10} {records:<8} {status}")
    
    print(f"\n📊 PORTFOLIO SUMMARY:")
    print(f"Real Data Coverage: {real_weight:.1f}%")
    print(f"Synthetic Data: {synthetic_weight:.1f}%")
    
    if real_weight > 80:
        print("✅ EXCELLENT - Most of your portfolio uses real market data!")
    elif real_weight > 50:
        print("⚠️  GOOD - Majority of portfolio has real data")
    else:
        print("❌ POOR - Mostly synthetic data")
    
    conn.close()

if __name__ == "__main__":
    simple_data_quality_check()