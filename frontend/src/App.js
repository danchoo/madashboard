import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { professionalTheme } from './theme/professionalTheme';
import PortfolioDashboard from './components/PortfolioDashboard';
import RiskDashboard from './components/RiskDashboard';

function App() {
  const [currentView, setCurrentView] = useState('portfolio');

  return (
    <ThemeProvider theme={professionalTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <AppBar position="static" elevation={0}>
          <Container maxWidth="xl">
            <Toolbar sx={{ px: 0 }}>
              <Typography 
                variant="h5" 
                component="div" 
                sx={{ 
                  flexGrow: 1, 
                  fontWeight: 700,
                  color: 'primary.main',
                  fontSize: '1.5rem'
                }}
              >
                MA Dashboard
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  color={currentView === 'portfolio' ? 'primary' : 'inherit'}
                  onClick={() => setCurrentView('portfolio')}
                  variant={currentView === 'portfolio' ? 'contained' : 'text'}
                  sx={{ 
                    fontWeight: 600,
                    px: 3,
                    color: currentView === 'portfolio' ? 'white' : 'text.primary'
                  }}
                >
                  Portfolio
                </Button>
                <Button 
                  color={currentView === 'risk' ? 'primary' : 'inherit'}
                  onClick={() => setCurrentView('risk')}
                  variant={currentView === 'risk' ? 'contained' : 'text'}
                  sx={{ 
                    fontWeight: 600,
                    px: 3,
                    color: currentView === 'risk' ? 'white' : 'text.primary'
                  }}
                >
                  Risk Analytics
                </Button>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>
        
        <Box sx={{ py: 4 }}>
          {currentView === 'portfolio' ? <PortfolioDashboard /> : <RiskDashboard />}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;