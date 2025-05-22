import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Alert,
  Box,
  LinearProgress
} from '@mui/material';
import { PlayArrow, Refresh } from '@mui/icons-material';

const RiskCalculationButton = ({ portfolioId = 1, onCalculationComplete }) => {
  const [calculating, setCalculating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:5000/api';

  const triggerRiskCalculation = async () => {
    setCalculating(true);
    setDialogOpen(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/portfolio/${portfolioId}/calculate-risk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        // Notify parent component to refresh data
        if (onCalculationComplete) {
          onCalculationComplete(data.data);
        }
      } else {
        setError(data.message || 'Risk calculation failed');
      }
    } catch (err) {
      setError('Failed to connect to risk calculation service');
    }

    setCalculating(false);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setResult(null);
    setError(null);
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={triggerRiskCalculation}
        disabled={calculating}
        startIcon={calculating ? <CircularProgress size={20} /> : <PlayArrow />}
        sx={{ mr: 2 }}
      >
        {calculating ? 'Calculating...' : 'Run Risk Calculation'}
      </Button>

      <Dialog 
        open={dialogOpen} 
        onClose={!calculating ? closeDialog : undefined}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Risk Calculation {calculating ? 'In Progress' : 'Complete'}
        </DialogTitle>
        
        <DialogContent>
          {calculating && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Running risk calculations with selected benchmark...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6">Calculation Failed</Typography>
              <Typography variant="body2">{error}</Typography>
            </Alert>
          )}

          {result && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="h6">Calculation Successful!</Typography>
                <Typography variant="body2">
                  Risk metrics have been updated with the latest benchmark settings.
                </Typography>
              </Alert>

              {result.data && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>Updated Risk Metrics:</Typography>
                  <Typography variant="body2">
                    <strong>Beta:</strong> {result.data.beta ? Number(result.data.beta).toFixed(3) : 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Correlation:</strong> {result.data.correlation ? Number(result.data.correlation).toFixed(3) : 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Annual Volatility:</strong> {result.data.annualized_volatility ? `${(Number(result.data.annualized_volatility) * 100).toFixed(1)}%` : 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Sharpe Ratio:</strong> {result.data.sharpe_ratio ? Number(result.data.sharpe_ratio).toFixed(2) : 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>VaR (95%):</strong> {result.data.var_1d_95 ? `${(Number(result.data.var_1d_95) * 100).toFixed(2)}%` : 'N/A'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          {!calculating && (
            <>
              <Button onClick={closeDialog}>
                Close
              </Button>
              <Button 
                onClick={triggerRiskCalculation}
                variant="contained"
                startIcon={<Refresh />}
              >
                Recalculate
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RiskCalculationButton;