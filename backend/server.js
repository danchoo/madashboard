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

// Get available benchmarks
app.get('/api/benchmarks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT benchmark_id, code, name, description, is_active
      FROM benchmarks 
      WHERE is_active = TRUE
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching benchmarks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio's current benchmark
app.get('/api/portfolio/:id/benchmark', async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const result = await pool.query(`
      SELECT 
        pb.portfolio_id,
        b.benchmark_id,
        b.code,
        b.name,
        b.description,
        pb.is_primary,
        pb.weight,
        pb.effective_date
      FROM portfolio_benchmarks pb
      JOIN benchmarks b ON pb.benchmark_id = b.benchmark_id
      WHERE pb.portfolio_id = $1 
      AND pb.effective_date <= CURRENT_DATE
      ORDER BY pb.effective_date DESC, pb.is_primary DESC
    `, [portfolioId]);

    if (result.rows.length > 0) {
      res.json(result.rows);
    } else {
      res.status(404).json({ error: 'No benchmark found for portfolio' });
    }
  } catch (err) {
    console.error('Error fetching portfolio benchmark:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update portfolio benchmark
app.put('/api/portfolio/:id/benchmark', async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const { benchmark_id, effective_date = new Date().toISOString().split('T')[0] } = req.body;

    // Insert new benchmark mapping
    await pool.query(`
      INSERT INTO portfolio_benchmarks (portfolio_id, benchmark_id, is_primary, effective_date)
      VALUES ($1, $2, TRUE, $3)
      ON CONFLICT (portfolio_id, benchmark_id, effective_date) 
      DO UPDATE SET is_primary = TRUE, weight = 1.0
    `, [portfolioId, benchmark_id, effective_date]);

    // Set other benchmarks as non-primary for this portfolio
    await pool.query(`
      UPDATE portfolio_benchmarks 
      SET is_primary = FALSE 
      WHERE portfolio_id = $1 AND benchmark_id != $2 AND effective_date = $3
    `, [portfolioId, benchmark_id, effective_date]);

    res.json({ 
      success: true, 
      message: 'Portfolio benchmark updated successfully',
      portfolio_id: portfolioId,
      benchmark_id: benchmark_id,
      effective_date: effective_date
    });
  } catch (err) {
    console.error('Error updating portfolio benchmark:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log(`   GET /api/benchmarks - Available benchmarks`);
console.log(`   GET /api/portfolio/:id/benchmark - Portfolio's current benchmark`);
console.log(`   PUT /api/portfolio/:id/benchmark - Update portfolio benchmark`);

// Trigger risk calculation for portfolio
app.post('/api/portfolio/:id/calculate-risk', async (req, res) => {
  try {
    const portfolioId = req.params.id;
    
    console.log('Starting risk calculation for portfolio:', portfolioId);
    
    // Import and run the risk calculator
    const { spawn } = require('child_process');
    
    // Run the Python risk calculator
    const pythonProcess = spawn('python', ['risk_calculator.py'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      const message = data.toString();
      output += message;
      console.log('Python stdout:', message);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const message = data.toString();
      errorOutput += message;
      console.error('Python stderr:', message);
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start Python process',
        error: error.message,
        details: 'Make sure Python is installed and accessible'
      });
    });
    
    pythonProcess.on('close', async (code) => {
      console.log(`Python process exited with code: ${code}`);
      console.log('Full output:', output);
      console.log('Full error output:', errorOutput);
      
      if (code === 0) {
        // Success - fetch the updated risk metrics
        try {
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
              beta,
              correlation
            FROM v_latest_risk_metrics
            WHERE portfolio_id = $1
          `, [portfolioId]);

          res.json({
            success: true,
            message: 'Risk calculation completed successfully',
            output: output,
            data: result.rows[0] || null
          });
        } catch (dbError) {
          console.error('Database error:', dbError);
          res.status(500).json({
            success: false,
            message: 'Risk calculation completed but failed to fetch results',
            error: dbError.message
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: `Python process failed with exit code ${code}`,
          error: errorOutput,
          output: output,
          details: 'Check Python script and dependencies'
        });
      }
    });

  } catch (err) {
    console.error('Error triggering risk calculation:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to start risk calculation',
      error: err.message 
    });
  }
});

// Get data quality overview
app.get('/api/data-quality', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        entity_type,
        identifier,
        name,
        data_source,
        first_real_date,
        last_real_date,
        total_records,
        real_records,
        synthetic_records,
        data_quality_score,
        quality_rating,
        data_type
      FROM v_data_quality_overview
      ORDER BY entity_type, identifier
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching data quality:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio data quality summary
app.get('/api/portfolio/:id/data-quality', async (req, res) => {
  try {
    const portfolioId = req.params.id;
    
    // Get data quality for portfolio holdings
    const result = await pool.query(`
      SELECT 
        s.ticker,
        s.name,
        h.weight,
        dqs.data_source,
        dqs.data_quality_score,
        dqs.quality_rating,
        dqs.data_type,
        dqs.last_real_date
      FROM portfolio_holdings h
      JOIN securities s ON h.security_id = s.security_id
      LEFT JOIN v_data_quality_overview dqs ON dqs.entity_type = 'security' AND dqs.entity_id = s.security_id
      WHERE h.portfolio_id = $1 AND h.date = CURRENT_DATE
      ORDER BY h.weight DESC
    `, [portfolioId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching portfolio data quality:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log(`   GET /api/data-quality - Overall data quality status`);
console.log(`   GET /api/portfolio/:id/data-quality - Portfolio data quality`);

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
