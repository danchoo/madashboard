-- Add fund holdings index
CREATE INDEX idx_fund_holdings_fund_date ON fund_holdings(fund_security_id, date DESC);
CREATE INDEX idx_fund_holdings_underlying_date ON fund_holdings(underlying_security_id, date);
CREATE INDEX idx_portfolio_holdings_level ON portfolio_holdings(portfolio_id, holding_level, date DESC);-- Multi-Asset Risk Dashboard - MVP Schema (Phase 1A)
-- Start simple, add complexity as needed

-- =====================================================
-- CORE REFERENCE DATA (MINIMAL)
-- =====================================================

-- Currencies (Essential for global portfolios)
CREATE TABLE currencies (
    currency_id SERIAL PRIMARY KEY,
    code CHAR(3) NOT NULL UNIQUE, -- ISO 4217 (USD, EUR, etc.)
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Asset Classes (Basic classification)
CREATE TABLE asset_classes (
    asset_class_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- SECURITIES (MINIMAL VIABLE)
-- =====================================================

-- Securities Master (Enhanced for multi-level structures)
CREATE TABLE securities (
    security_id SERIAL PRIMARY KEY,
    ticker VARCHAR(50) NOT NULL,
    name VARCHAR(500) NOT NULL,
    
    -- Multiple identifiers for cross-referencing
    isin VARCHAR(12), -- International Securities Identification Number
    cusip VARCHAR(9), -- North American securities
    sedol VARCHAR(7), -- Stock Exchange Daily Official List (global)
    figi VARCHAR(12), -- Bloomberg Financial Instrument Global Identifier
    bloomberg_ticker VARCHAR(100), -- Bloomberg-specific ticker
    
    -- Security type classification
    security_type VARCHAR(50) NOT NULL DEFAULT 'Stock', -- Stock, ETF, Mutual Fund, Bond, etc.
    
    -- Basic classifications
    asset_class_id INTEGER REFERENCES asset_classes(asset_class_id),
    currency_id INTEGER REFERENCES currencies(currency_id),
    
    -- ETF/Fund specific information
    is_fund BOOLEAN DEFAULT FALSE, -- TRUE for ETFs, mutual funds, etc.
    has_underlying_holdings BOOLEAN DEFAULT FALSE, -- TRUE if we track holdings within this security
    fund_type VARCHAR(50), -- ETF, Mutual Fund, Index Fund, etc.
    expense_ratio DECIMAL(6,4), -- Annual expense ratio (e.g., 0.0019 for 0.19%)
    
    -- Exchange and market info
    exchange VARCHAR(20), -- ASX, NYSE, NASDAQ, etc.
    primary_exchange VARCHAR(20), -- Primary listing exchange
    country_of_domicile VARCHAR(3), -- ISO country code
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ticker, exchange),
    CHECK (security_type IN ('Stock', 'ETF', 'Mutual Fund', 'Bond', 'Option', 'Future', 'Cash', 'Other'))
);

-- Security Prices (Essential for any portfolio system)
CREATE TABLE security_prices (
    security_id INTEGER REFERENCES securities(security_id),
    date DATE NOT NULL,
    close_price DECIMAL(15,6) NOT NULL,
    
    -- Data source tracking
    data_source VARCHAR(50) DEFAULT 'Manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (security_id, date)
);

-- =====================================================
-- PORTFOLIOS (MINIMAL VIABLE)
-- =====================================================

-- Portfolio Definitions (Start with basics)
CREATE TABLE portfolios (
    portfolio_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Essential metadata
    base_currency_id INTEGER REFERENCES currencies(currency_id),
    inception_date DATE NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Holdings (ETF/Mutual Fund underlying holdings)
-- This tracks what securities are INSIDE each fund
CREATE TABLE fund_holdings (
    fund_holding_id SERIAL PRIMARY KEY,
    fund_security_id INTEGER REFERENCES securities(security_id), -- The fund (e.g., DHHF)
    underlying_security_id INTEGER REFERENCES securities(security_id), -- What the fund holds (e.g., STW)
    date DATE NOT NULL,
    
    -- Holding data within the fund
    shares DECIMAL(20,6), -- Number of shares the fund holds
    market_value DECIMAL(20,2) NOT NULL, -- Market value of this holding
    weight DECIMAL(8,6) NOT NULL, -- Weight within the fund (0-1)
    
    -- Data source and quality
    data_source VARCHAR(50) DEFAULT 'Fund Provider',
    is_estimated BOOLEAN DEFAULT FALSE, -- TRUE if weight is estimated
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(fund_security_id, underlying_security_id, date)
);

-- Portfolio Holdings (Enhanced to support multi-level lookthrough)
CREATE TABLE portfolio_holdings (
    holding_id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(portfolio_id),
    security_id INTEGER REFERENCES securities(security_id),
    date DATE NOT NULL,
    
    -- Position Data
    quantity DECIMAL(20,6) NOT NULL,
    market_value DECIMAL(20,2) NOT NULL,
    weight DECIMAL(8,6) NOT NULL, -- Portfolio weight (0-1)
    
    -- Multi-level tracking
    holding_level INTEGER DEFAULT 1, -- 1=Direct, 2=Through Fund, 3=Through Fund of Fund
    parent_holding_id INTEGER REFERENCES portfolio_holdings(holding_id), -- For lookthrough holdings
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(portfolio_id, security_id, date, holding_level, parent_holding_id)
);

-- =====================================================
-- BASIC RISK CALCULATIONS (MINIMAL)
-- =====================================================

-- Portfolio Performance (Daily snapshot)
CREATE TABLE portfolio_performance (
    portfolio_id INTEGER REFERENCES portfolios(portfolio_id),
    date DATE NOT NULL,
    
    -- Basic performance metrics
    total_value DECIMAL(20,2) NOT NULL,
    daily_return DECIMAL(10,6),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (portfolio_id, date)
);

-- Basic Risk Metrics (Start with essentials)
CREATE TABLE portfolio_risk_metrics (
    portfolio_id INTEGER REFERENCES portfolios(portfolio_id),
    date DATE NOT NULL,
    
    -- Basic risk measures
    volatility_30d DECIMAL(8,6), -- 30-day rolling volatility
    var_1d_95 DECIMAL(10,6), -- 1-day VaR at 95%
    max_drawdown DECIMAL(8,6), -- Max drawdown
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (portfolio_id, date)
);

-- =====================================================
-- BASIC INDEXES
-- =====================================================

CREATE INDEX idx_security_prices_date ON security_prices(date);
CREATE INDEX idx_portfolio_holdings_portfolio_date ON portfolio_holdings(portfolio_id, date DESC);
CREATE INDEX idx_portfolio_performance_date ON portfolio_performance(date);

-- =====================================================
-- REFERENCE DATA INSERTS
-- =====================================================

-- Basic currencies
INSERT INTO currencies (code, name) VALUES 
('USD', 'US Dollar'),
('EUR', 'Euro'),
('GBP', 'British Pound');

-- Basic asset classes
INSERT INTO asset_classes (name, description) VALUES 
('Equity', 'Stock investments'),
('Fixed Income', 'Bond investments'),
('Cash', 'Cash and equivalents');

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Enhanced sample securities with multiple identifiers
INSERT INTO securities (ticker, name, asset_class_id, currency_id, security_type, is_fund, has_underlying_holdings, fund_type, expense_ratio, exchange, isin, sedol, country_of_domicile) VALUES 
-- Australian ETFs (like DHHF structure) with real identifiers
('DHHF', 'BetaShares Diversified High Growth ETF', 1, 1, 'ETF', TRUE, TRUE, 'ETF', 0.0019, 'ASX', 'AU000000DHHF9', 'BPY2Z38', 'AUS'),
('STW', 'SPDR S&P ASX 200 ETF', 1, 1, 'ETF', TRUE, TRUE, 'ETF', 0.0013, 'ASX', 'AU0000STOWOR7', 'BWD1X29', 'AUS'),
('VEU', 'Vanguard FTSE Developed Markets ETF', 1, 1, 'ETF', TRUE, TRUE, 'ETF', 0.0008, 'NYSE', 'US9229085538', '2174929', 'USA'),
('VGS', 'Vanguard MSCI Index International Shares ETF', 1, 1, 'ETF', TRUE, TRUE, 'ETF', 0.0018, 'ASX', 'AU0000VGFRGR2', 'BWH1W49', 'AUS'),

-- Individual Australian stocks
('CBA.AX', 'Commonwealth Bank of Australia', 1, 1, 'Stock', FALSE, FALSE, NULL, NULL, 'ASX', 'AU000000CBA7', '6174030', 'AUS'),
('CSL.AX', 'CSL Limited', 1, 1, 'Stock', FALSE, FALSE, NULL, NULL, 'ASX', 'AU000000CSL8', '6134509', 'AUS'),
('BHP.AX', 'BHP Group Limited', 1, 1, 'Stock', FALSE, FALSE, NULL, NULL, 'ASX', 'AU000000BHP4', '6088284', 'AUS'),

-- US stocks  
('AAPL', 'Apple Inc', 1, 1, 'Stock', FALSE, FALSE, NULL, NULL, 'NASDAQ', 'US0378331005', '2046251', 'USA'),
('MSFT', 'Microsoft Corp', 1, 1, 'Stock', FALSE, FALSE, NULL, NULL, 'NASDAQ', 'US5949181045', '2588173', 'USA'),
('GOOGL', 'Alphabet Inc', 1, 1, 'Stock', FALSE, FALSE, NULL, NULL, 'NASDAQ', 'US02079K3059', 'BYY88Y7', 'USA'),

-- Cash position
('CASH', 'Cash Position', 3, 1, 'Cash', FALSE, FALSE, NULL, NULL, NULL, NULL, NULL, NULL);

-- Sample portfolio with DHHF focus
INSERT INTO portfolios (name, code, base_currency_id, inception_date) VALUES 
('DHHF Portfolio', 'DHHF01', 1, '2024-01-01');

-- Level 1: Direct holdings in portfolio (what investor directly owns)
INSERT INTO portfolio_holdings (portfolio_id, security_id, date, quantity, market_value, weight, holding_level) VALUES 
(1, 1, CURRENT_DATE, 1000, 30000, 0.60, 1),    -- DHHF 60%
(1, 2, CURRENT_DATE, 500, 15000, 0.30, 1),     -- STW 30% 
(1, 11, CURRENT_DATE, 1, 5000, 0.10, 1);       -- CASH 10%

-- DHHF underlying holdings (Level 2: What DHHF holds)
INSERT INTO fund_holdings (fund_security_id, underlying_security_id, date, market_value, weight) VALUES 
-- DHHF typical allocation
(1, 2, CURRENT_DATE, 12000, 0.40),   -- STW 40% of DHHF
(1, 3, CURRENT_DATE, 9000, 0.30),    -- VEU 30% of DHHF  
(1, 4, CURRENT_DATE, 9000, 0.30);    -- VGS 30% of DHHF

-- STW underlying holdings (Level 3: What STW holds - top Australian stocks)
INSERT INTO fund_holdings (fund_security_id, underlying_security_id, date, market_value, weight) VALUES 
-- STW top holdings (simplified)
(2, 5, CURRENT_DATE, 1200, 0.10),    -- CBA 10% of STW
(2, 6, CURRENT_DATE, 840, 0.07),     -- CSL 7% of STW
(2, 7, CURRENT_DATE, 720, 0.06);     -- BHP 6% of STW

-- VGS underlying holdings (Level 3: What VGS holds - international stocks)
INSERT INTO fund_holdings (fund_security_id, underlying_security_id, date, market_value, weight) VALUES 
-- VGS top holdings (simplified)
(4, 8, CURRENT_DATE, 540, 0.06),     -- AAPL 6% of VGS
(4, 9, CURRENT_DATE, 450, 0.05),     -- MSFT 5% of VGS
(4, 10, CURRENT_DATE, 360, 0.04);    -- GOOGL 4% of VGS

-- Sample prices (updated for new securities)
INSERT INTO security_prices (security_id, date, close_price) VALUES 
(1, CURRENT_DATE, 30.00),     -- DHHF
(2, CURRENT_DATE, 30.00),     -- STW
(3, CURRENT_DATE, 45.00),     -- VEU
(4, CURRENT_DATE, 90.00),     -- VGS
(5, CURRENT_DATE, 120.00),    -- CBA.AX
(6, CURRENT_DATE, 280.00),    -- CSL.AX
(7, CURRENT_DATE, 45.00),     -- BHP.AX
(8, CURRENT_DATE, 150.00),    -- AAPL
(9, CURRENT_DATE, 300.00),    -- MSFT
(10, CURRENT_DATE, 2500.00),  -- GOOGL
(11, CURRENT_DATE, 1.00);     -- CASH

-- Sample portfolio performance (updated value)
INSERT INTO portfolio_performance (portfolio_id, date, total_value, daily_return) VALUES 
(1, CURRENT_DATE, 50000, 0.0012); -- 0.12% daily return

-- =====================================================
-- SIMPLE VIEWS FOR TESTING
-- =====================================================

-- Current holdings view (Level 1 - Direct holdings only)
CREATE VIEW v_current_holdings AS
SELECT 
    p.name as portfolio_name,
    s.ticker,
    s.name as security_name,
    s.security_type,
    ac.name as asset_class,
    h.quantity,
    h.market_value,
    h.weight,
    h.holding_level,
    h.date
FROM portfolio_holdings h
JOIN portfolios p ON h.portfolio_id = p.portfolio_id
JOIN securities s ON h.security_id = s.security_id
JOIN asset_classes ac ON s.asset_class_id = ac.asset_class_id
WHERE h.date = CURRENT_DATE AND h.holding_level = 1;

-- Fund holdings breakdown view
CREATE VIEW v_fund_breakdown AS
SELECT 
    fund.ticker as fund_ticker,
    fund.name as fund_name,
    underlying.ticker as underlying_ticker,
    underlying.name as underlying_name,
    underlying.security_type as underlying_type,
    fh.weight as weight_in_fund,
    fh.market_value,
    fh.date
FROM fund_holdings fh
JOIN securities fund ON fh.fund_security_id = fund.security_id
JOIN securities underlying ON fh.underlying_security_id = underlying.security_id
WHERE fh.date = CURRENT_DATE;

-- Complete lookthrough view (All levels)
CREATE VIEW v_portfolio_lookthrough AS
WITH RECURSIVE portfolio_tree AS (
    -- Level 1: Direct holdings
    SELECT 
        ph.portfolio_id,
        ph.security_id,
        ph.market_value,
        ph.weight as portfolio_weight,
        1 as level,
        ARRAY[s.ticker] as path,
        s.ticker,
        s.name as security_name,
        s.security_type
    FROM portfolio_holdings ph
    JOIN securities s ON ph.security_id = s.security_id
    WHERE ph.date = CURRENT_DATE AND ph.holding_level = 1
    
    UNION ALL
    
    -- Recursive: Holdings within funds
    SELECT 
        pt.portfolio_id,
        fh.underlying_security_id as security_id,
        pt.market_value * fh.weight as market_value,
        pt.portfolio_weight * fh.weight as portfolio_weight,
        pt.level + 1,
        pt.path || us.ticker,
        us.ticker,
        us.name as security_name,
        us.security_type
    FROM portfolio_tree pt
    JOIN fund_holdings fh ON pt.security_id = fh.fund_security_id AND fh.date = CURRENT_DATE
    JOIN securities us ON fh.underlying_security_id = us.security_id
    WHERE pt.level < 5 -- Prevent infinite recursion
)
SELECT 
    p.name as portfolio_name,
    pt.level,
    array_to_string(pt.path, ' -> ') as holding_path,
    pt.ticker,
    pt.security_name,
    pt.security_type,
    pt.market_value,
    pt.portfolio_weight,
    CASE 
        WHEN pt.level = 1 THEN 'Direct'
        WHEN pt.level = 2 THEN 'Fund Level 1'
        WHEN pt.level = 3 THEN 'Fund Level 2'
        ELSE 'Deep Level'
    END as holding_type
FROM portfolio_tree pt
JOIN portfolios p ON pt.portfolio_id = p.portfolio_id
ORDER BY pt.portfolio_id, pt.level, pt.portfolio_weight DESC;

-- Portfolio summary view
CREATE VIEW v_portfolio_summary AS
SELECT 
    p.portfolio_id,
    p.name,
    p.code,
    COUNT(h.security_id) as num_holdings,
    SUM(h.market_value) as total_value,
    MAX(h.date) as as_of_date
FROM portfolios p
LEFT JOIN portfolio_holdings h ON p.portfolio_id = h.portfolio_id
GROUP BY p.portfolio_id, p.name, p.code;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE securities IS 'Simplified securities master - add fields as needed';
COMMENT ON TABLE portfolio_holdings IS 'Core holdings data - foundation for all analytics';
COMMENT ON TABLE portfolio_performance IS 'Basic performance tracking - expand later';
COMMENT ON TABLE portfolio_risk_metrics IS 'Essential risk metrics - add more as needed';

-- =====================================================
-- WHAT TO ADD NEXT (PHASE BY PHASE)
-- =====================================================

/*

PHASE 1B - Add Bloomberg Integration:
- bloomberg_securities table
- bloomberg_prices table  
- Enhanced security_prices with more fields

PHASE 1C - Add Basic Risk Models:
- risk_factors table
- factor_exposures table
- Enhanced risk calculations

PHASE 1D - Add Benchmarks:
- benchmarks table
- benchmark_constituents table
- benchmark_performance table

PHASE 2 - Add Peer Analysis:
- peer_universes table
- portfolio_peer_mappings table (reuse portfolios table)

PHASE 3 - Add Performance Attribution:
- attribution_methods table
- attribution_results table

This approach allows you to:
1. Get something working QUICKLY (this week!)
2. Test with real data immediately  
3. Add complexity only when needed
4. Get user feedback early and often

*/