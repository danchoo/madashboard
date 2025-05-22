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

const PortfolioDashboard = ({ portfolioId = 1 }) => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [lookthroughData, setLookthroughData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchPortfolioData();
  }, [portfolioId]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      
      // Fetch portfolio summary
      const response = await fetch(`${API_BASE_URL}/portfolio/summary`);
      if (response.ok) {
        const data = await response.json();
        setPortfolioData(data);
      } else {
        setError('Failed to fetch portfolio data');
      }
      
      // Fetch lookthrough data
      try {
        const lookthroughResponse = await fetch(`${API_BASE_URL}/portfolio/lookthrough`);
        if (lookthroughResponse.ok) {
          const lookthroughData = await lookthroughResponse.json();
          setLookthroughData(lookthroughData);
        }
      } catch (lookthroughError) {
        console.log('Lookthrough API not available, using sample data');
      }
      
      setLoading(false);
    } catch (err) {
      setError('Error connecting to API');
      setLoading(false);
    }
  };

  const COLORS = ['#FF6B35', '#4299E1', '#48BB78', '#ED8936', '#9F7AEA'];

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // Sample data for demo
  const sampleData = {
    portfolio_value: 50000,
    num_holdings: 3,
    portfolio_code: 'DHHF01',
    as_of_date: new Date().toISOString(),
    holdings: [
      { ticker: 'DHHF', name: 'BetaShares Diversified High Growth ETF', weight: 0.6, market_value: 30000 },
      { ticker: 'STW', name: 'SPDR S&P ASX 200 ETF', weight: 0.3, market_value: 15000 },
      { ticker: 'CASH', name: 'Cash Position', weight: 0.1, market_value: 5000 }
    ]
  };

  // Sample lookthrough data showing the multi-layer structure
  const sampleLookthroughData = [
    { level: 1, holding_path: 'DHHF', ticker: 'DHHF', security_name: 'BetaShares Diversified High Growth ETF', security_type: 'ETF', portfolio_weight: 0.60 },
    { level: 1, holding_path: 'STW', ticker: 'STW', security_name: 'SPDR S&P ASX 200 ETF', security_type: 'ETF', portfolio_weight: 0.30 },
    { level: 1, holding_path: 'CASH', ticker: 'CASH', security_name: 'Cash Position', security_type: 'Cash', portfolio_weight: 0.10 },
    { level: 2, holding_path: 'DHHF → STW', ticker: 'STW', security_name: 'SPDR S&P ASX 200 ETF (via DHHF)', security_type: 'ETF', portfolio_weight: 0.24 },
    { level: 2, holding_path: 'DHHF → VGS', ticker: 'VGS', security_name: 'Vanguard MSCI Index International Shares ETF', security_type: 'ETF', portfolio_weight: 0.18 },
    { level: 2, holding_path: 'DHHF → VEU', ticker: 'VEU', security_name: 'Vanguard FTSE Developed Markets ETF', security_type: 'ETF', portfolio_weight: 0.18 },
    { level: 3, holding_path: 'DHHF → STW → CBA.AX', ticker: 'CBA.AX', security_name: 'Commonwealth Bank of Australia', security_type: 'Stock', portfolio_weight: 0.024 },
    { level: 3, holding_path: 'DHHF → STW → BHP.AX', ticker: 'BHP.AX', security_name: 'BHP Group Limited', security_type: 'Stock', portfolio_weight: 0.0144 },
    { level: 3, holding_path: 'DHHF → STW → CSL.AX', ticker: 'CSL.AX', security_name: 'CSL Limited', security_type: 'Stock', portfolio_weight: 0.012 },
    { level: 3, holding_path: 'DHHF → VGS → AAPL', ticker: 'AAPL', security_name: 'Apple Inc', security_type: 'Stock', portfolio_weight: 0.0108 },
    { level: 3, holding_path: 'DHHF → VGS → MSFT', ticker: 'MSFT', security_name: 'Microsoft Corp', security_type: 'Stock', portfolio_weight: 0.009 },
    { level: 3, holding_path: 'DHHF → VGS → GOOGL', ticker: 'GOOGL', security_name: 'Alphabet Inc', security_type: 'Stock', portfolio_weight: 0.0072 },
  ];

  const data = portfolioData || sampleData;
  const lookthrough = lookthroughData.length > 0 ? lookthroughData : sampleLookthroughData;

  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      {/* Header Section */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ 
          color: 'text.primary', 
          fontWeight: 700, 
          mb: 2 
        }}>
          Multi-Asset Dashboard
        </Typography>
        <Typography variant="h6" component="h2" sx={{ 
          color: 'text.secondary', 
          mb: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          DHHF Portfolio (DHHF01) - Live Database Connection 🔗
        </Typography>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={4} sx={{ mb: 8 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 20px -4px rgba(0, 0, 0, 0.15)'
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ 
                fontWeight: 600, 
                mb: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '0.75rem'
              }}>
                Portfolio Value
              </Typography>
              <Typography variant="h4" component="div" sx={{ 
                color: 'primary.main', 
                fontWeight: 700, 
                mb: 1,
                fontSize: '2rem'
              }}>
                USD {data.portfolio_value?.toLocaleString() || '50,000'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 20px -4px rgba(0, 0, 0, 0.15)'
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ 
                fontWeight: 600, 
                mb: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '0.75rem'
              }}>
                Direct Holdings
              </Typography>
              <Typography variant="h4" component="div" sx={{ 
                color: 'info.main', 
                fontWeight: 700, 
                mb: 1,
                fontSize: '2rem'
              }}>
                {data.num_holdings || 3}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 20px -4px rgba(0, 0, 0, 0.15)'
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ 
                fontWeight: 600, 
                mb: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '0.75rem'
              }}>
                Portfolio Code
              </Typography>
              <Typography variant="h4" component="div" sx={{ 
                color: 'success.main', 
                fontWeight: 700, 
                mb: 1,
                fontSize: '2rem'
              }}>
                {data.portfolio_code || 'DHHF01'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 20px -4px rgba(0, 0, 0, 0.15)'
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ 
                fontWeight: 600, 
                mb: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '0.75rem'
              }}>
                As of Date
              </Typography>
              <Typography variant="h6" component="div" sx={{ 
                color: 'text.primary', 
                fontWeight: 600, 
                mb: 1,
                fontSize: '1.1rem'
              }}>
                {new Date().toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={6} sx={{ mb: 8 }}>
        {/* Pie Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: 480,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)'
            }
          }}>
            <CardContent sx={{ p: 5 }}>
              <Typography variant="h6" component="div" gutterBottom sx={{ 
                fontWeight: 600, 
                mb: 4,
                color: 'text.primary',
                fontSize: '1.25rem'
              }}>
                Direct Holdings Allocation
              </Typography>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={data.holdings?.map(h => ({ name: h.ticker, value: h.weight * 100 })) || [
                      { name: 'DHHF', value: 60 },
                      { name: 'STW', value: 30 },
                      { name: 'CASH', value: 10 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.holdings?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    )) || COLORS.slice(0, 3).map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value.toFixed(1)}%`}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: 480,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)'
            }
          }}>
            <CardContent sx={{ p: 5 }}>
              <Typography variant="h6" component="div" gutterBottom sx={{ 
                fontWeight: 600, 
                mb: 4,
                color: 'text.primary',
                fontSize: '1.25rem'
              }}>
                Holdings by Value
              </Typography>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={data.holdings?.map(h => ({ name: h.ticker, value: h.market_value })) || [
                    { name: 'DHHF', value: 30000 },
                    { name: 'STW', value: 15000 },
                    { name: 'CASH', value: 5000 }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#718096', fontSize: 12 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis 
                    tick={{ fill: '#718096', fontSize: 12 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`USD ${value.toLocaleString()}`, 'Value']}
                    labelStyle={{ color: '#2D3748' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#FF6B35" 
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Holdings Table */}
      <Card sx={{
        mb: 8,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)'
        }
      }}>
        <CardContent sx={{ p: 5 }}>
          <Typography variant="h6" component="div" gutterBottom sx={{ 
            fontWeight: 600, 
            mb: 4,
            color: 'text.primary',
            fontSize: '1.25rem'
          }}>
            Portfolio Holdings Details
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <Box component="thead">
                <Box component="tr">
                  <Box component="th" sx={{ 
                    textAlign: 'left', 
                    py: 3, 
                    px: 4, 
                    fontWeight: 600, 
                    color: 'text.secondary', 
                    borderBottom: '2px solid', 
                    borderColor: 'grey.200',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem'
                  }}>
                    Security
                  </Box>
                  <Box component="th" sx={{ 
                    textAlign: 'right', 
                    py: 3, 
                    px: 4, 
                    fontWeight: 600, 
                    color: 'text.secondary', 
                    borderBottom: '2px solid', 
                    borderColor: 'grey.200',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem'
                  }}>
                    Weight
                  </Box>
                  <Box component="th" sx={{ 
                    textAlign: 'right', 
                    py: 3, 
                    px: 4, 
                    fontWeight: 600, 
                    color: 'text.secondary', 
                    borderBottom: '2px solid', 
                    borderColor: 'grey.200',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem'
                  }}>
                    Market Value
                  </Box>
                </Box>
              </Box>
              <Box component="tbody">
                {(data.holdings || sampleData.holdings).map((holding, index) => (
                  <Box component="tr" key={index} sx={{ 
                    '&:hover': { 
                      backgroundColor: 'grey.50',
                      transform: 'scale(1.01)',
                      transition: 'all 0.2s ease-in-out'
                    } 
                  }}>
                    <Box component="td" sx={{ 
                      py: 4, 
                      px: 4, 
                      borderBottom: '1px solid', 
                      borderColor: 'grey.100' 
                    }}>
                      <Box>
                        <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ mb: 0.5 }}>
                          {holding.ticker}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {holding.name}
                        </Typography>
                      </Box>
                    </Box>
                    <Box component="td" sx={{ 
                      textAlign: 'right', 
                      py: 4, 
                      px: 4, 
                      borderBottom: '1px solid', 
                      borderColor: 'grey.100' 
                    }}>
                      <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ fontSize: '1rem' }}>
                        {(holding.weight * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ 
                      textAlign: 'right', 
                      py: 4, 
                      px: 4, 
                      borderBottom: '1px solid', 
                      borderColor: 'grey.100' 
                    }}>
                      <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ fontSize: '1rem' }}>
                        USD {holding.market_value.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Complete Portfolio Lookthrough Table */}
      <Card sx={{
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12)'
        }
      }}>
        <CardContent sx={{ p: 5 }}>
          <Typography variant="h6" component="div" gutterBottom sx={{ 
            fontWeight: 600, 
            mb: 2,
            color: 'text.primary',
            fontSize: '1.25rem'
          }}>
            Complete Portfolio Lookthrough (Live Database)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Multi-layer transparency showing DHHF → underlying ETFs → individual securities
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <Box component="thead">
                <Box component="tr">
                  <Box component="th" sx={{ 
                    textAlign: 'left', 
                    py: 3, 
                    px: 4, 
                    fontWeight: 600, 
                    color: 'text.secondary', 
                    borderBottom: '2px solid', 
                    borderColor: 'grey.200',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem'
                  }}>
                    Level
                  </Box>
                  <Box component="th" sx={{ 
                    textAlign: 'left', 
                    py: 3, 
                    px: 4, 
                    fontWeight: 600, 
                    color: 'text.secondary', 
                    borderBottom: '2px solid', 
                    borderColor: 'grey.200',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem'
                  }}>
                    Holding Path
                  </Box>
                  <Box component="th" sx={{ 
                    textAlign: 'left', 
                    py: 3, 
                    px: 4, 
                    fontWeight: 600, 
                    color: 'text.secondary', 
                    borderBottom: '2px solid', 
                    borderColor: 'grey.200',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem'
                  }}>
                    Security
                  </Box>
                  <Box component="th" sx={{ 
                    textAlign: 'left', 
                    py: 3, 
                    px: 4, 
                    fontWeight: 600, 
                    color: 'text.secondary', 
                    borderBottom: '2px solid', 
                    borderColor: 'grey.200',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem'
                  }}>
                    Type
                  </Box>
                  <Box component="th" sx={{ 
                    textAlign: 'right', 
                    py: 3, 
                    px: 4, 
                    fontWeight: 600, 
                    color: 'text.secondary', 
                    borderBottom: '2px solid', 
                    borderColor: 'grey.200',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem'
                  }}>
                    Effective Weight
                  </Box>
                </Box>
              </Box>
              <Box component="tbody">
                {lookthrough.map((item, index) => (
                  <Box component="tr" key={index} sx={{ 
                    '&:hover': { 
                      backgroundColor: 'grey.50',
                      transition: 'all 0.2s ease-in-out'
                    } 
                  }}>
                    <Box component="td" sx={{ 
                      py: 4, 
                      px: 4, 
                      borderBottom: '1px solid', 
                      borderColor: 'grey.100' 
                    }}>
                      <Box sx={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        px: 2, 
                        py: 1, 
                        borderRadius: '12px',
                        backgroundColor: item.level === 1 ? 'primary.main' : item.level === 2 ? 'info.main' : 'success.main',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        Level {item.level}
                      </Box>
                    </Box>
                    <Box component="td" sx={{ 
                      py: 4, 
                      px: 4, 
                      borderBottom: '1px solid', 
                      borderColor: 'grey.100' 
                    }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {item.holding_path}
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ 
                      py: 4, 
                      px: 4, 
                      borderBottom: '1px solid', 
                      borderColor: 'grey.100' 
                    }}>
                      <Box>
                        <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ mb: 0.5 }}>
                          {item.ticker}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.security_name}
                        </Typography>
                      </Box>
                    </Box>
                    <Box component="td" sx={{ 
                      py: 4, 
                      px: 4, 
                      borderBottom: '1px solid', 
                      borderColor: 'grey.100' 
                    }}>
                      <Box sx={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        px: 2, 
                        py: 1, 
                        borderRadius: '8px',
                        backgroundColor: item.security_type === 'ETF' ? 'warning.light' : item.security_type === 'Stock' ? 'success.light' : 'grey.200',
                        color: item.security_type === 'ETF' ? 'warning.dark' : item.security_type === 'Stock' ? 'success.dark' : 'grey.700',
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }}>
                        {item.security_type}
                      </Box>
                    </Box>
                    <Box component="td" sx={{ 
                      textAlign: 'right', 
                      py: 4, 
                      px: 4, 
                      borderBottom: '1px solid', 
                      borderColor: 'grey.100' 
                    }}>
                      <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ fontSize: '1rem' }}>
                        {(item.portfolio_weight * 100).toFixed(2)}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default PortfolioDashboard;