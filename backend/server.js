 const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'madashboard',
  user: process.env.DB_USER || 'ma_user',
  password: process.env.DB_PASSWORD || 'dev_password123',
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// API Routes

// Get portfolio summary
app.get('/api/portfolio/summary', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_portfolio_summary');
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Portfolio not found' });
    }
  } catch (err) {
    console.error('Error fetching portfolio summary:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current holdings (direct holdings)
app.get('/api/portfolio/holdings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ticker,
        security_name,
        security_type,
        asset_class,
        quantity,
        market_value,
        weight,
        date
      FROM v_current_holdings
      ORDER BY weight DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching holdings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get complete portfolio lookthrough
app.get('/api/portfolio/lookthrough', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        portfolio_name,
        level,
        holding_path,
        ticker,
        security_name,
        security_type,
        market_value,
        portfolio_weight,
        holding_type
      FROM v_portfolio_lookthrough
      ORDER BY level, portfolio_weight DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching lookthrough data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fund breakdown
app.get('/api/portfolio/fund-breakdown', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        fund_ticker,
        fund_name,
        underlying_ticker,
        underlying_name,
        underlying_type,
        weight_in_fund,
        market_value,
        date
      FROM v_fund_breakdown
      ORDER BY fund_ticker, weight_in_fund DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching fund breakdown:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get securities with identifiers
app.get('/api/securities', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        security_id,
        ticker,
        name,
        security_type,
        exchange,
        isin,
        sedol,
        cusip,
        country_of_domicile,
        expense_ratio,
        is_fund
      FROM securities
      WHERE is_active = true
      ORDER BY ticker
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching securities:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio performance
app.get('/api/portfolio/performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        portfolio_id,
        date,
        total_value,
        daily_return
      FROM portfolio_performance
      ORDER BY date DESC
      LIMIT 30
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching performance data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Multi-Asset Dashboard API is running',
    timestamp: new Date().toISOString()
  });
});

// Get risk metrics for portfolio
app.get('/api/portfolio/:id/risk-metrics', async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const result = await pool.query(`
      SELECT 
        portfolio_name,
        calculation_date,
        var_1d_95,
        var_1d_99,
        annualized_volatility,
        sharpe_ratio,
        max_drawdown,
        tracking_error,
        beta
      FROM v_latest_risk_metrics
      WHERE portfolio_id = $1
    `, [portfolioId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'No risk metrics found' });
    }
  } catch (err) {
    console.error('Error fetching risk metrics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Portfolio API server running on http://localhost:${port}`);
  console.log(`📊 Dashboard API endpoints:`);
  console.log(`   GET /api/portfolio/summary - Portfolio overview`);
  console.log(`   GET /api/portfolio/holdings - Direct holdings`);
  console.log(`   GET /api/portfolio/lookthrough - Complete lookthrough`);
  console.log(`   GET /api/portfolio/fund-breakdown - Fund composition`);
  console.log(`   GET /api/securities - All securities with identifiers`);
  console.log(`   GET /api/health - Health check`);
});

module.exports = app;
