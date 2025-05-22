import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Box,
  LinearProgress,
  Collapse,
  IconButton,
  Tabs,
  Tab,
  Grid
} from '@mui/material';
import { ExpandMore, ExpandLess, Warning, Check, Error, TrendingUp, AccountBalance } from '@mui/icons-material';

const DataQualityPanel = ({ portfolioId = 1 }) => {
  const [dataQuality, setDataQuality] = useState([]);
  const [portfolioQuality, setPortfolioQuality] = useState([]);
  const [benchmarkQuality, setBenchmarkQuality] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchDataQuality();
    fetchPortfolioQuality();
  }, [portfolioId]);

  const fetchDataQuality = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/data-quality`);
      if (response.ok) {
        const data = await response.json();
        setDataQuality(data);
        
        // Separate securities and benchmarks
        const benchmarks = data.filter(item => item.entity_type === 'benchmark');
        setBenchmarkQuality(benchmarks);
      }
    } catch (err) {
      console.error('Error fetching data quality:', err);
    }
  };

  const fetchPortfolioQuality = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio/${portfolioId}/data-quality`);
      if (response.ok) {
        const data = await response.json();
        setPortfolioQuality(data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching portfolio data quality:', err);
      setLoading(false);
    }
  };

  const getQualityIcon = (rating, dataType) => {
    if (dataType === 'Synthetic Only') return <Warning color="warning" />;
    
    switch (rating) {
      case 'Excellent': return <Check color="success" />;
      case 'Good': return <Check color="primary" />;
      case 'Fair': return <Warning color="warning" />;
      case 'Poor': return <Error color="error" />;
      default: return <Warning color="disabled" />;
    }
  };

  const getQualityColor = (rating, dataType) => {
    if (dataType === 'Synthetic Only') return 'warning';
    
    switch (rating) {
      case 'Excellent': return 'success';
      case 'Good': return 'primary';
      case 'Fair': return 'warning';
      case 'Poor': return 'error';
      default: return 'default';
    }
  };

  const calculateOverallQuality = () => {
    if (!portfolioQuality.length) return { score: 0, rating: 'Unknown' };
    
    const weightedScore = portfolioQuality.reduce((sum, item) => {
      const weight = parseFloat(item.weight) || 0;
      const score = parseFloat(item.data_quality_score) || 0;
      return sum + (weight * score);
    }, 0);
    
    let rating = 'Poor';
    if (weightedScore >= 0.9) rating = 'Excellent';
    else if (weightedScore >= 0.7) rating = 'Good';
    else if (weightedScore >= 0.5) rating = 'Fair';
    
    return { score: weightedScore, rating };
  };

  const calculateBenchmarkQuality = () => {
    if (!benchmarkQuality.length) return { score: 0, rating: 'Unknown', realCount: 0, totalCount: 0 };
    
    const avgScore = benchmarkQuality.reduce((sum, item) => {
      return sum + (parseFloat(item.data_quality_score) || 0);
    }, 0) / benchmarkQuality.length;
    
    const realCount = benchmarkQuality.filter(item => item.data_type === 'Real Data').length;
    
    let rating = 'Poor';
    if (avgScore >= 0.9) rating = 'Excellent';
    else if (avgScore >= 0.7) rating = 'Good';
    else if (avgScore >= 0.5) rating = 'Fair';
    
    return { 
      score: avgScore, 
      rating, 
      realCount, 
      totalCount: benchmarkQuality.length 
    };
  };

  const overallQuality = calculateOverallQuality();
  const benchmarkOverallQuality = calculateBenchmarkQuality();
  const realDataCount = portfolioQuality.filter(item => item.data_type === 'Real Data').length;
  const syntheticCount = portfolioQuality.filter(item => item.data_type === 'Synthetic Only').length;

  if (loading) return <LinearProgress />;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            Data Quality Status
          </Typography>
          <IconButton onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        {/* Quality Summary Cards */}
        <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Alert 
              severity={overallQuality.rating === 'Excellent' || overallQuality.rating === 'Good' ? 'success' : 'warning'}
              icon={<TrendingUp />}
            >
              <Typography variant="subtitle2">
                Portfolio Data Quality: {overallQuality.rating} ({(overallQuality.score * 100).toFixed(1)}%)
              </Typography>
              <Typography variant="body2">
                {realDataCount} holdings with real market data, {syntheticCount} synthetic
              </Typography>
            </Alert>
          </Grid>
          <Grid item xs={12} md={6}>
            <Alert 
              severity={benchmarkOverallQuality.rating === 'Excellent' || benchmarkOverallQuality.rating === 'Good' ? 'success' : 'warning'}
              icon={<AccountBalance />}
            >
              <Typography variant="subtitle2">
                Benchmark Data Quality: {benchmarkOverallQuality.rating} ({(benchmarkOverallQuality.score * 100).toFixed(1)}%)
              </Typography>
              <Typography variant="body2">
                {benchmarkOverallQuality.realCount}/{benchmarkOverallQuality.totalCount} benchmarks with real data
              </Typography>
            </Alert>
          </Grid>
        </Grid>

        {/* Tabs for Portfolio vs Benchmark Quality */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label={`Portfolio Holdings (${portfolioQuality.length})`} />
            <Tab label={`Benchmarks (${benchmarkQuality.length})`} />
          </Tabs>
        </Box>

        {/* Portfolio Holdings Quality */}
        {selectedTab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Security</TableCell>
                  <TableCell align="right">Weight</TableCell>
                  <TableCell>Data Source</TableCell>
                  <TableCell>Quality</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {portfolioQuality.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getQualityIcon(item.quality_rating, item.data_type)}
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {item.ticker}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {(parseFloat(item.weight) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.data_source || 'Unknown'}
                        size="small"
                        color={item.data_source === 'yfinance' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.data_type}
                        size="small"
                        color={getQualityColor(item.quality_rating, item.data_type)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.last_real_date ? new Date(item.last_real_date).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Benchmark Quality */}
        {selectedTab === 1 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Benchmark</TableCell>
                  <TableCell>Data Source</TableCell>
                  <TableCell>Quality Score</TableCell>
                  <TableCell>Records</TableCell>
                  <TableCell>Date Range</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {benchmarkQuality.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getQualityIcon(item.quality_rating, item.data_type)}
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {item.identifier}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.data_source || 'Unknown'}
                        size="small"
                        color={item.data_source === 'yfinance' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={`${(parseFloat(item.data_quality_score) * 100).toFixed(0)}%`}
                          size="small"
                          color={getQualityColor(item.quality_rating, item.data_type)}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {item.quality_rating}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.real_records}/{item.total_records}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.first_real_date && item.last_real_date ? 
                          `${new Date(item.first_real_date).toLocaleDateString()} - ${new Date(item.last_real_date).toLocaleDateString()}` 
                          : 'N/A'
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Detailed Data Quality (Collapsible) */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Complete System Data Quality Overview
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Identifier</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Quality Score</TableCell>
                    <TableCell>Records</TableCell>
                    <TableCell>Date Range</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataQuality.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip 
                          label={item.entity_type}
                          size="small"
                          color={item.entity_type === 'security' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {item.identifier}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.data_source}
                          size="small"
                          color={item.data_source === 'yfinance' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getQualityIcon(item.quality_rating, item.data_type)}
                          {(parseFloat(item.data_quality_score) * 100).toFixed(0)}%
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.real_records}/{item.total_records}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.first_real_date && item.last_real_date ? 
                            `${new Date(item.first_real_date).toLocaleDateString()} - ${new Date(item.last_real_date).toLocaleDateString()}` 
                            : 'N/A'
                          }
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default DataQualityPanel;