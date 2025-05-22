import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const PortfolioDashboard = () => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [holdingsData, setHoldingsData] = useState([]);
  const [lookthroughData, setLookthroughData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:5000/api';

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch portfolio summary
        const summaryResponse = await fetch(`${API_BASE_URL}/portfolio/summary`);
        const summaryData = await summaryResponse.json();
        
        // Fetch holdings
        const holdingsResponse = await fetch(`${API_BASE_URL}/portfolio/holdings`);
        const holdingsRawData = await holdingsResponse.json();
        
        // Fetch lookthrough data
        const lookthroughResponse = await fetch(`${API_BASE_URL}/portfolio/lookthrough`);
        const lookthroughRawData = await lookthroughResponse.json();
        
        // Process portfolio summary
        setPortfolioData({
          name: summaryData.name || 'Portfolio',
          code: summaryData.code || 'N/A',
          totalValue: summaryData.total_value || 0,
          numHoldings: summaryData.num_holdings || 0,
          asOfDate: summaryData.as_of_date || new Date().toISOString().split('T')[0]
        });
        
        // Process holdings data for charts
        const processedHoldings = holdingsRawData.map(holding => ({
          name: holding.ticker,
          fullName: holding.security_name,
          value: parseFloat(holding.market_value) || 0,
          percentage: (parseFloat(holding.weight) * 100) || 0,
          type: holding.security_type,
          quantity: parseFloat(holding.quantity) || 0
        }));
        setHoldingsData(processedHoldings);
        
        // Process lookthrough data
        const processedLookthrough = lookthroughRawData.map(item => ({
          path: item.holding_path || '',
          security: item.security_name || '',
          ticker: item.ticker || '',
          type: item.security_type || '',
          weight: (parseFloat(item.portfolio_weight) * 100) || 0,
          level: item.level || 1,
          holdingType: item.holding_type || '',
          marketValue: parseFloat(item.market_value) || 0
        }));
        setLookthroughData(processedLookthrough);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch portfolio data. Make sure the API server is running.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading your DHHF portfolio data...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1">
          Make sure your API server is running on http://localhost:5000
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Typography variant="h3" component="h1" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
        Multi-Asset Dashboard
      </Typography>
      
      <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#666', mb: 3 }}>
        {portfolioData?.name} ({portfolioData?.code}) - Live Database Connection 🔗
      </Typography>
      
      {/* Portfolio Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom color="text.secondary">
                Portfolio Value
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                {formatCurrency(portfolioData?.totalValue || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom color="text.secondary">
                Direct Holdings
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                {portfolioData?.numHoldings || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom color="text.secondary">
                Portfolio Code
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                {portfolioData?.code || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom color="text.secondary">
                As of Date
              </Typography>
              <Typography variant="h5" component="div" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                {portfolioData?.asOfDate || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Holdings Pie Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Direct Holdings Allocation
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={holdingsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {holdingsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Holdings Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Holdings by Value
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={holdingsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(value), 'Value']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="value" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Holdings Details Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" component="div" gutterBottom>
            Direct Holdings Details
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={1} sx={{ fontWeight: 'bold', borderBottom: '2px solid #1976d2', pb: 1, mb: 2 }}>
              <Grid item xs={2}>
                <Typography variant="subtitle2">Ticker</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Security Name</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="subtitle2">Type</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="subtitle2">Weight</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="subtitle2">Value</Typography>
              </Grid>
            </Grid>
            
            {holdingsData.map((holding, index) => (
              <Grid 
                container 
                spacing={1} 
                key={index} 
                sx={{ 
                  py: 1, 
                  borderBottom: '1px solid #eee',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
              >
                <Grid item xs={2}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {holding.name}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2">{holding.fullName}</Typography>
                </Grid>
                <Grid item xs={2}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: holding.type === 'Stock' ? '#d32f2f' : holding.type === 'ETF' ? '#1976d2' : '#ed6c02',
                      fontWeight: 'bold'
                    }}
                  >
                    {holding.type}
                  </Typography>
                </Grid>
                <Grid item xs={2}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatPercentage(holding.percentage)}
                  </Typography>
                </Grid>
                <Grid item xs={2}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(holding.value)}
                  </Typography>
                </Grid>
              </Grid>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Lookthrough Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" component="div" gutterBottom>
            Complete Portfolio Lookthrough (Live Database)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Shows your complete DHHF structure: Direct holdings → Fund holdings → Individual stocks
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={1} sx={{ fontWeight: 'bold', borderBottom: '2px solid #1976d2', pb: 1, mb: 2 }}>
              <Grid item xs={3}>
                <Typography variant="subtitle2">Holding Path</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Security</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="subtitle2">Type</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="subtitle2">Effective Weight</Typography>
              </Grid>
              <Grid item xs={1}>
                <Typography variant="subtitle2">Level</Typography>
              </Grid>
            </Grid>
            
            {lookthroughData.map((item, index) => (
              <Grid 
                container 
                spacing={1} 
                key={index} 
                sx={{ 
                  py: 1, 
                  borderBottom: '1px solid #eee',
                  backgroundColor: item.level === 1 ? '#f0f7ff' : item.level === 2 ? '#f8f9fa' : 'white',
                  '&:hover': { backgroundColor: item.level === 1 ? '#e3f2fd' : item.level === 2 ? '#f5f5f5' : '#fafafa' }
                }}
              >
                <Grid item xs={3}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.75rem',
                      fontWeight: item.level === 1 ? 'bold' : 'normal'
                    }}
                  >
                    {item.path}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" sx={{ fontWeight: item.level === 3 ? 'bold' : 'normal' }}>
                    {item.security}
                  </Typography>
                </Grid>
                <Grid item xs={2}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: item.type === 'Stock' ? '#d32f2f' : item.type === 'ETF' ? '#1976d2' : '#ed6c02',
                      fontWeight: 'bold'
                    }}
                  >
                    {item.type}
                  </Typography>
                </Grid>
                <Grid item xs={2}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: item.type === 'Stock' ? '#d32f2f' : '#1976d2'
                    }}
                  >
                    {formatPercentage(item.weight)}
                  </Typography>
                </Grid>
                <Grid item xs={1}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: item.level === 1 ? '#1976d2' : item.level === 2 ? '#ed6c02' : '#d32f2f'
                    }}
                  >
                    {item.level}
                  </Typography>
                </Grid>
              </Grid>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default PortfolioDashboard;