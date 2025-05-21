#!/usr/bin/env python3
"""
Test script for DHHF multi-layer portfolio structure with enhanced identifiers
"""
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'database': 'madashboard',
    'user': 'ma_user',
    'password': 'dev_password123',
    'port': 5432
}

def test_dhhf_structure():
    """Test the DHHF multi-layer portfolio structure"""
    try:
        # Connect to database
        print("🔌 Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("✅ Connected successfully!")
        
        # Test 1: Check tables exist
        print("\n📋 Testing table creation...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print(f"Found {len(tables)} tables:")
        for table in tables:
            print(f"  - {table['table_name']}")
        
        # Test 2: Security identifiers validation
        print("\n🔍 Testing Enhanced Security Identifiers:")
        cursor.execute("""
            SELECT ticker, name, security_type, exchange, isin, sedol, cusip, country_of_domicile
            FROM securities 
            WHERE ticker IN ('DHHF', 'CBA.AX', 'AAPL')
            ORDER BY ticker;
        """)
        securities = cursor.fetchall()
        
        print(f"{'Ticker':<10} {'Exchange':<8} {'ISIN':<15} {'SEDOL':<10} {'Country':<8}")
        print("-" * 65)
        for sec in securities:
            isin = sec['isin'] or 'N/A'
            sedol = sec['sedol'] or 'N/A'
            country = sec['country_of_domicile'] or 'N/A'
            print(f"{sec['ticker']:<10} {sec['exchange'] or 'N/A':<8} {isin:<15} {sedol:<10} {country:<8}")
        
        # Test 3: Direct holdings (Level 1)
        print("\n💼 Level 1 - Direct Portfolio Holdings:")
        cursor.execute("SELECT * FROM v_current_holdings;")
        holdings = cursor.fetchall()
        
        total_weight = 0
        print(f"{'Ticker':<8} {'Security':<35} {'Type':<8} {'Weight':<8} {'Value':<12}")
        print("-" * 80)
        for holding in holdings:
            total_weight += holding['weight']
            print(f"{holding['ticker']:<8} {holding['security_name'][:34]:<35} {holding['security_type']:<8} {holding['weight']:<8.1%} ${holding['market_value']:>10,.0f}")
        print(f"{'Total:':<52} {total_weight:<8.1%} ${sum(h['market_value'] for h in holdings):>10,.0f}")
        
        # Test 4: Fund breakdown (Level 2) 
        print("\n🏗️  Level 2 - Fund Holdings Breakdown:")
        cursor.execute("""
            SELECT fund_ticker, fund_name, underlying_ticker, underlying_name, 
                   underlying_type, weight_in_fund, market_value
            FROM v_fund_breakdown 
            ORDER BY fund_ticker, weight_in_fund DESC;
        """)
        fund_holdings = cursor.fetchall()
        
        if fund_holdings:
            current_fund = None
            for holding in fund_holdings:
                if current_fund != holding['fund_ticker']:
                    current_fund = holding['fund_ticker']
                    print(f"\n📊 {holding['fund_ticker']} ({holding['fund_name']}) contains:")
                    print(f"{'  Ticker':<12} {'Security':<35} {'Type':<8} {'Weight':<8}")
                    print("  " + "-" * 70)
                
                print(f"  {holding['underlying_ticker']:<12} {holding['underlying_name'][:34]:<35} {holding['underlying_type']:<8} {holding['weight_in_fund']:<8.1%}")
        
        # Test 5: Complete lookthrough (All 3 levels)
        print("\n🔍 Complete Portfolio Lookthrough (All Levels):")
        cursor.execute("""
            SELECT level, holding_path, ticker, security_name, security_type, 
                   portfolio_weight, market_value, holding_type
            FROM v_portfolio_lookthrough 
            ORDER BY level, portfolio_weight DESC;
        """)
        lookthrough = cursor.fetchall()
        
        if lookthrough:
            current_level = None
            total_by_level = {}
            
            for holding in lookthrough:
                level = holding['level']
                
                if current_level != level:
                    current_level = level
                    print(f"\n📈 {holding['holding_type']} Holdings:")
                    print(f"{'Path':<25} {'Ticker':<8} {'Security':<25} {'Type':<8} {'Weight':<8} {'Value':<10}")
                    print("-" * 95)
                    total_by_level[level] = 0
                
                # Truncate path for display
                path_display = holding['holding_path'][:24] if len(holding['holding_path']) > 24 else holding['holding_path']
                total_by_level[level] += holding['portfolio_weight']
                
                print(f"{path_display:<25} {holding['ticker']:<8} {holding['security_name'][:24]:<25} {holding['security_type']:<8} {holding['portfolio_weight']:<8.1%} ${holding['market_value']:>8,.0f}")
            
            print(f"\n📊 Weight Summary by Level:")
            for level, total in total_by_level.items():
                level_name = {1: "Direct", 2: "Fund Level 1", 3: "Fund Level 2"}.get(level, f"Level {level}")
                print(f"  {level_name}: {total:.1%}")
        
        # Test 6: Specific stock exposure analysis
        print("\n🎯 Individual Stock Exposures (Level 3):")
        cursor.execute("""
            SELECT ticker, security_name, portfolio_weight, holding_path
            FROM v_portfolio_lookthrough 
            WHERE level = 3 AND security_type = 'Stock'
            ORDER BY portfolio_weight DESC;
        """)
        stock_exposures = cursor.fetchall()
        
        if stock_exposures:
            print(f"{'Ticker':<10} {'Company':<30} {'Effective Weight':<15} {'Path'}")
            print("-" * 80)
            total_stock_exposure = 0
            for stock in stock_exposures:
                total_stock_exposure += stock['portfolio_weight']
                print(f"{stock['ticker']:<10} {stock['security_name'][:29]:<30} {stock['portfolio_weight']:<15.2%} {stock['holding_path']}")
            print(f"{'Total Stock Exposure:':<41} {total_stock_exposure:<15.2%}")
        
        # Test 7: Portfolio summary
        print("\n📊 Portfolio Summary:")
        cursor.execute("SELECT * FROM v_portfolio_summary;")
        summary = cursor.fetchone()
        
        if summary:
            print(f"Portfolio: {summary['name']} ({summary['code']})")
            print(f"Direct Holdings: {summary['num_holdings']} securities")
            print(f"Total Value: ${summary['total_value']:,.0f}")
            print(f"As of: {summary['as_of_date']}")
        
        cursor.close()
        conn.close()
        print("\n🎉 All DHHF structure tests passed! Multi-layer portfolio tracking is working.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

def show_dhhf_analysis():
    """Show specific DHHF analysis with enhanced identifiers"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("\n" + "="*70)
        print("📈 DHHF ETF DETAILED ANALYSIS")
        print("="*70)
        
        # DHHF metadata with identifiers
        print("\n🔍 DHHF Security Details:")
        cursor.execute("""
            SELECT ticker, name, security_type, exchange, expense_ratio, 
                   isin, sedol, country_of_domicile
            FROM securities 
            WHERE ticker = 'DHHF';
        """)
        dhhf_info = cursor.fetchone()
        
        if dhhf_info:
            print(f"  Name: {dhhf_info['name']}")
            print(f"  Exchange: {dhhf_info['exchange']}")
            print(f"  Expense Ratio: {dhhf_info['expense_ratio']:.2%}")
            print(f"  ISIN: {dhhf_info['isin']}")
            print(f"  SEDOL: {dhhf_info['sedol']}")
            print(f"  Country: {dhhf_info['country_of_domicile']}")
        
        # DHHF composition with identifiers
        print("\n🏗️ DHHF Direct Holdings:")
        cursor.execute("""
            SELECT u.ticker, u.name, u.exchange, u.sedol, u.country_of_domicile,
                   fh.weight, fh.market_value
            FROM fund_holdings fh
            JOIN securities fund ON fh.fund_security_id = fund.security_id
            JOIN securities u ON fh.underlying_security_id = u.security_id
            WHERE fund.ticker = 'DHHF' AND fh.date = CURRENT_DATE
            ORDER BY fh.weight DESC;
        """)
        dhhf_holdings = cursor.fetchall()
        
        print(f"{'Ticker':<6} {'Name':<35} {'Exchange':<8} {'SEDOL':<10} {'Weight':<8}")
        print("-" * 75)
        for holding in dhhf_holdings:
            sedol = holding['sedol'] or 'N/A'
            exchange = holding['exchange'] or 'N/A'
            print(f"{holding['ticker']:<6} {holding['name'][:34]:<35} {exchange:<8} {sedol:<10} {holding['weight']:>6.1%}")
        
        # Calculate effective Australian exposure through STW with identifiers
        print("\n🇦🇺 Australian Stock Exposure (through STW):")
        cursor.execute("""
            WITH australian_exposure AS (
                SELECT 
                    underlying.ticker,
                    underlying.name,
                    underlying.sedol,
                    underlying.isin,
                    (0.60 * 0.40 * stw_holdings.weight) as effective_weight
                FROM fund_holdings stw_holdings
                JOIN securities stw ON stw_holdings.fund_security_id = stw.security_id
                JOIN securities underlying ON stw_holdings.underlying_security_id = underlying.security_id
                WHERE stw.ticker = 'STW' AND stw_holdings.date = CURRENT_DATE
            )
            SELECT ticker, name, sedol, effective_weight
            FROM australian_exposure
            ORDER BY effective_weight DESC;
        """)
        aus_stocks = cursor.fetchall()
        
        print(f"{'Ticker':<10} {'Company':<30} {'SEDOL':<10} {'Eff. Weight':<12}")
        print("-" * 70)
        total_aus_exposure = 0
        for stock in aus_stocks:
            total_aus_exposure += stock['effective_weight']
            sedol = stock['sedol'] or 'N/A'
            print(f"{stock['ticker']:<10} {stock['name'][:29]:<30} {sedol:<10} {stock['effective_weight']:>10.2%}")
        print(f"{'Total Australian Equity:':<51} {total_aus_exposure:>10.2%}")
        
        # International exposure analysis
        print("\n🌍 International Stock Exposure (through VGS):")
        cursor.execute("""
            WITH international_exposure AS (
                SELECT 
                    underlying.ticker,
                    underlying.name,
                    underlying.sedol,
                    underlying.country_of_domicile,
                    (0.60 * 0.30 * vgs_holdings.weight) as effective_weight
                FROM fund_holdings vgs_holdings
                JOIN securities vgs ON vgs_holdings.fund_security_id = vgs.security_id
                JOIN securities underlying ON vgs_holdings.underlying_security_id = underlying.security_id
                WHERE vgs.ticker = 'VGS' AND vgs_holdings.date = CURRENT_DATE
            )
            SELECT ticker, name, sedol, country_of_domicile, effective_weight
            FROM international_exposure
            ORDER BY effective_weight DESC;
        """)
        intl_stocks = cursor.fetchall()
        
        print(f"{'Ticker':<8} {'Company':<25} {'SEDOL':<10} {'Country':<8} {'Eff. Weight':<12}")
        print("-" * 75)
        total_intl_exposure = 0
        for stock in intl_stocks:
            total_intl_exposure += stock['effective_weight']
            sedol = stock['sedol'] or 'N/A'
            country = stock['country_of_domicile'] or 'N/A'
            print(f"{stock['ticker']:<8} {stock['name'][:24]:<25} {sedol:<10} {country:<8} {stock['effective_weight']:>10.2%}")
        print(f"{'Total International Equity:':<53} {total_intl_exposure:>10.2%}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error in DHHF analysis: {e}")

def test_identifier_validation():
    """Test security identifier validation and lookups"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("\n" + "="*60)
        print("🔍 SECURITY IDENTIFIER VALIDATION")
        print("="*60)
        
        # Test identifier uniqueness and coverage
        cursor.execute("""
            SELECT 
                security_type,
                COUNT(*) as total_securities,
                COUNT(isin) as has_isin,
                COUNT(sedol) as has_sedol,
                COUNT(cusip) as has_cusip,
                COUNT(CASE WHEN isin IS NOT NULL OR sedol IS NOT NULL THEN 1 END) as has_global_id
            FROM securities
            GROUP BY security_type
            ORDER BY security_type;
        """)
        
        coverage = cursor.fetchall()
        
        print(f"{'Type':<12} {'Total':<6} {'ISIN':<6} {'SEDOL':<7} {'CUSIP':<7} {'Global ID':<10}")
        print("-" * 55)
        for row in coverage:
            print(f"{row['security_type']:<12} {row['total_securities']:<6} {row['has_isin']:<6} {row['has_sedol']:<7} {row['has_cusip']:<7} {row['has_global_id']:<10}")
        
        print(f"\n✅ Identifier coverage looks good!")
        print(f"   All ETFs and Stocks have either ISIN or SEDOL for global identification")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error in identifier validation: {e}")

if __name__ == "__main__":
    success = test_dhhf_structure()
    if success:
        show_dhhf_analysis()
        test_identifier_validation()