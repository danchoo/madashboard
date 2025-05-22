import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Box,
  Chip
} from '@mui/material';

const BenchmarkSelector = ({ portfolioId = 1 }) => {
  const [benchmarks, setBenchmarks] = useState([]);
  const [currentBenchmark, setCurrentBenchmark] = useState(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  const API_BASE_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchBenchmarks();
    fetchCurrentBenchmark();
  }, [portfolioId]);

  const fetchBenchmarks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/benchmarks`);
      if (response.ok) {
        const data = await response.json();
        setBenchmarks(data);
      }
    } catch (err) {
      console.error('Error fetching benchmarks:', err);
    }
  };

  const fetchCurrentBenchmark = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio/${portfolioId}/benchmark`);
      if (response.ok) {
        const data = await response.json();
        const primary = data.find(b => b.is_primary) || data[0];
        setCurrentBenchmark(primary);
        setSelectedBenchmark(primary?.benchmark_id || '');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching current benchmark:', err);
      setLoading(false);
    }
  };

  const updateBenchmark = async () => {
    if (!selectedBenchmark) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio/${portfolioId}/benchmark`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          benchmark_id: selectedBenchmark,
          effective_date: new Date().toISOString().split('T')[0]
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Benchmark updated successfully! Recalculate risk metrics to see new beta.' });
        fetchCurrentBenchmark();
      } else {
        setMessage({ type: 'error', text: 'Failed to update benchmark' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error updating benchmark' });
    }
    setUpdating(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          Portfolio Benchmark Settings
        </Typography>
        
        {currentBenchmark && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Current Benchmark:
            </Typography>
            <Chip 
              label={`${currentBenchmark.code} - ${currentBenchmark.name}`}
              color="primary"
              sx={{ mt: 1 }}
            />
          </Box>
        )}

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select New Benchmark</InputLabel>
          <Select
            value={selectedBenchmark}
            label="Select New Benchmark"
            onChange={(e) => setSelectedBenchmark(e.target.value)}
          >
            {benchmarks.map((benchmark) => (
              <MenuItem key={benchmark.benchmark_id} value={benchmark.benchmark_id}>
                <Box>
                  <Typography variant="body1">{benchmark.code}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {benchmark.name}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button 
          variant="contained" 
          onClick={updateBenchmark}
          disabled={updating || !selectedBenchmark || selectedBenchmark === currentBenchmark?.benchmark_id}
          sx={{ mr: 2 }}
        >
          {updating ? 'Updating...' : 'Update Benchmark'}
        </Button>

        <Button 
          variant="outlined" 
          onClick={fetchCurrentBenchmark}
          disabled={updating}
        >
          Refresh
        </Button>

        {message && (
          <Alert 
            severity={message.type} 
            sx={{ mt: 2 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          <strong>Note:</strong> After changing the benchmark, recalculate risk metrics to see updated beta values.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BenchmarkSelector;