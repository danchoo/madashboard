import { createTheme } from '@mui/material/styles';

export const professionalTheme = createTheme({
  palette: {
    primary: {
      main: '#FF6B35',      // Professional orange
      light: '#FF8C42',     // Lighter orange
      dark: '#E55A2B',      // Darker orange
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2D3748',      // Professional dark gray
      light: '#4A5568',     
      dark: '#1A202C',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F7FAFC',   // Light gray background
      paper: '#FFFFFF',     // White cards
    },
    text: {
      primary: '#2D3748',   // Dark gray text
      secondary: '#718096', // Medium gray
    },
    success: {
      main: '#48BB78',      // Green for positive metrics
      light: '#68D391',
      dark: '#38A169',
    },
    error: {
      main: '#F56565',      // Red for risk/negative
      light: '#FC8181',
      dark: '#E53E3E',
    },
    warning: {
      main: '#ED8936',      // Orange warning
      light: '#F6AD55',
      dark: '#DD6B20',
    },
    info: {
      main: '#4299E1',      // Blue for information
      light: '#63B3ED',
      dark: '#3182CE',
    },
    grey: {
      50: '#F7FAFC',
      100: '#EDF2F7',
      200: '#E2E8F0',
      300: '#CBD5E0',
      400: '#A0AEC0',
      500: '#718096',
      600: '#4A5568',
      700: '#2D3748',
      800: '#1A202C',
      900: '#171923',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#2D3748',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#2D3748',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#2D3748',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#2D3748',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      color: '#2D3748',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#2D3748',
    },
    body1: {
      fontSize: '1rem',
      color: '#2D3748',
    },
    body2: {
      fontSize: '0.875rem',
      color: '#718096',
    },
    caption: {
      fontSize: '0.75rem',
      color: '#A0AEC0',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid #E2E8F0',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 24px',
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#2D3748',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
});