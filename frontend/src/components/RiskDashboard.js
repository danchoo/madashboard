import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';

const RiskDashboard = ({ portfolioId = 1 }) => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/portfolio/${portfolioId}/risk-metrics`);
        if (response.ok) {
          const data = await response.json();
          setRiskData(data);
        } else {
          setError('Failed to fetch risk data');
        }
        setLoading(false);
      } catch (err) {
        setError('Error connecting to API');
        setLoading(false);
      }
    };

    fetchRiskData();
  }, [portfolioId]);

  const formatPercent = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toFixed(decimals);
  };

  const getRiskLevel = (var95) => {
    if (!var95) return { level: 'Unknown', color: 'default' };
    const varPercent = var95 * 100;
    if (varPercent < 1) return { level: 'Low', color: 'success' };
    if (varPercent < 2) return { level: 'Moderate', color: 'warning' };
    return { level: 'High', color: 'error' };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const riskLevel = getRiskLevel(riskData?.var_1d_95);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Typography variant="h3" component="h1" gutterBottom sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
        Risk Analytics Dashboard
      </Typography>
      
      <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#666', mb: 3 }}>
        {riskData?.portfolio_name} - Risk Metrics 📊
      </Typography>

      {/* Risk Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', border: '2px solid #d32f2f' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom color="text.secondary">
                Value at Risk (95%)
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                {formatPercent(riskData?.var_1d_95)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Daily 95% confidence
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip 
                  label={riskLevel.level} 
                  color={riskLevel.color} 
                  size="small" 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom color="text.secondary">
                Volatility (Annual)
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                {formatPercent(riskData?.annualized_volatility)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Annualized standard deviation
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom color="text.secondary">
                Sharpe Ratio
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                {formatNumber(riskData?.sharpe_ratio)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Risk-adjusted return
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom color="text.secondary">
                Max Drawdown
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                {formatPercent(riskData?.max_drawdown)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Worst peak-to-trough decline
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Secondary Risk Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Beta
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                {formatNumber(riskData?.beta)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Tracking Error
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                {formatPercent(riskData?.tracking_error)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                VaR (99%)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                {formatPercent(riskData?.var_1d_99)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risk Interpretation */}
      <Card>
        <CardContent>
          <Typography variant="h6" component="div" gutterBottom>
            Risk Metrics Interpretation
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Value at Risk (VaR)
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                VaR estimates the maximum potential loss with 95% confidence. 
                A VaR of {formatPercent(riskData?.var_1d_95)} means there's a 5% chance 
                of losing more than this amount in a single day.
              </Typography>
              
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Sharpe Ratio
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                The Sharpe ratio of {formatNumber(riskData?.sharpe_ratio)} measures 
                risk-adjusted returns. Values above 1.0 are considered good, above 2.0 are excellent.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Maximum Drawdown
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                The largest peak-to-trough decline of {formatPercent(riskData?.max_drawdown)}. 
                This shows the worst loss period an investor would have experienced.
              </Typography>
              
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Beta
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Beta of {formatNumber(riskData?.beta)} shows market sensitivity. 
                Values above 1.0 indicate higher volatility than the benchmark.
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default RiskDashboard;