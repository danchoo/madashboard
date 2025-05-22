import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import PortfolioDashboard from './components/PortfolioDashboard';
import RiskDashboard from './components/RiskDashboard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [currentView, setCurrentView] = useState('portfolio');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Multi-Asset Dashboard
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => setCurrentView('portfolio')}
            sx={{ fontWeight: currentView === 'portfolio' ? 'bold' : 'normal' }}
          >
            Portfolio
          </Button>
          <Button 
            color="inherit" 
            onClick={() => setCurrentView('risk')}
            sx={{ fontWeight: currentView === 'risk' ? 'bold' : 'normal' }}
          >
            Risk Analytics
          </Button>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ mt: 2 }}>
        {currentView === 'portfolio' ? <PortfolioDashboard /> : <RiskDashboard />}
      </Box>
    </ThemeProvider>
  );
}

export default App;