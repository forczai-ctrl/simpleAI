import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f7f8f6',
      paper: '#ffffff',
    },
    primary: {
      main: '#245f5a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7b4b73',
    },
    success: {
      main: '#2f7d51',
    },
    warning: {
      main: '#b87919',
    },
    error: {
      main: '#b84242',
    },
    text: {
      primary: '#1d2524',
      secondary: '#64706d',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 760,
      letterSpacing: 0,
    },
    h2: {
      fontSize: '1.35rem',
      fontWeight: 760,
      letterSpacing: 0,
    },
    h3: {
      fontSize: '1rem',
      fontWeight: 720,
      letterSpacing: 0,
    },
    button: {
      textTransform: 'none',
      fontWeight: 720,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(36, 95, 90, 0.11)',
          boxShadow: '0 10px 32px rgba(30, 44, 41, 0.08)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
})

