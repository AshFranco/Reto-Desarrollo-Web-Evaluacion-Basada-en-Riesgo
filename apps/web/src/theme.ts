import { createTheme } from '@mui/material';

/**
 * Tema centralizado — único lugar que gobierna la apariencia visual de
 * toda la app (Fase 8, pulido visual). Azul institucional #2A6DB0
 * elegido por el equipo (contraste ~5.36:1 con texto blanco, pasa AA).
 * Estructura minimalista: tarjetas con borde fino en vez de sombra
 * pesada, tablas con una sola línea divisoria, etiquetas pequeñas en
 * mayúsculas (variant="overline") sobre títulos grandes.
 */
export const theme = createTheme({
  palette: {
    primary: {
      main: '#2A6DB0',
      light: '#5B8FC4',
      dark: '#1D4E80',
      contrastText: '#FFFFFF',
    },
    success: { main: '#2E7D32' }, // activo / aprobado
    error: { main: '#C62828' }, // deficiente / destructivo
    warning: { main: '#B8860B' }, // pendiente / borrador — ámbar con buen contraste sobre blanco
    background: {
      default: '#F6F7F9',
      paper: '#FFFFFF',
    },
    divider: 'rgba(15, 23, 42, 0.08)',
    text: {
      primary: '#1A2027',
      secondary: '#5B6572',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    h4: { fontWeight: 700, letterSpacing: -0.3 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    overline: {
      fontWeight: 700,
      letterSpacing: 1,
      fontSize: '0.72rem',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shadows: [
    'none',
    '0 1px 2px rgba(15, 23, 42, 0.06)',
    '0 1px 3px rgba(15, 23, 42, 0.08)',
    '0 2px 6px rgba(15, 23, 42, 0.08)',
    '0 2px 8px rgba(15, 23, 42, 0.10)',
    '0 4px 10px rgba(15, 23, 42, 0.10)',
    '0 4px 12px rgba(15, 23, 42, 0.12)',
    '0 6px 14px rgba(15, 23, 42, 0.12)',
    '0 6px 16px rgba(15, 23, 42, 0.12)',
    '0 8px 18px rgba(15, 23, 42, 0.14)',
    '0 8px 20px rgba(15, 23, 42, 0.14)',
    '0 10px 22px rgba(15, 23, 42, 0.14)',
    '0 10px 24px rgba(15, 23, 42, 0.16)',
    '0 12px 26px rgba(15, 23, 42, 0.16)',
    '0 12px 28px rgba(15, 23, 42, 0.16)',
    '0 14px 30px rgba(15, 23, 42, 0.18)',
    '0 14px 32px rgba(15, 23, 42, 0.18)',
    '0 16px 34px rgba(15, 23, 42, 0.18)',
    '0 16px 36px rgba(15, 23, 42, 0.2)',
    '0 18px 38px rgba(15, 23, 42, 0.2)',
    '0 18px 40px rgba(15, 23, 42, 0.2)',
    '0 20px 42px rgba(15, 23, 42, 0.22)',
    '0 20px 44px rgba(15, 23, 42, 0.22)',
    '0 22px 46px rgba(15, 23, 42, 0.22)',
    '0 22px 48px rgba(15, 23, 42, 0.24)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Degradado muy sutil (apenas perceptible) en vez de un gris
        // plano -- misma idea que el fondo del login, aplicada a toda la
        // app para que no se sienta tan "vacía", sin perder el look
        // minimalista de base.
        body: { background: 'linear-gradient(160deg, #F8FAFC 0%, #F0F3F8 55%, #ECF1F7 100%)', backgroundAttachment: 'fixed' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: 'rgba(15, 23, 42, 0.08)' },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderColor: 'rgba(15, 23, 42, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'background-color 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          textTransform: 'uppercase',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: 0.5,
          color: '#5B6572',
          borderBottom: '1px solid rgba(15, 23, 42, 0.10)',
        },
        body: {
          borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
        },
      },
    },
    MuiTableContainer: {
      defaultProps: {},
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderBottom: '1px solid rgba(15, 23, 42, 0.08)' },
      },
    },
  },
});
