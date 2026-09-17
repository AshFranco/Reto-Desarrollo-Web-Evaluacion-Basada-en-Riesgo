import { Box, CircularProgress, Typography } from '@mui/material';

/** Estado de carga consistente (spinner + mensaje) para reemplazar los CircularProgress sueltos sin contexto. */
export function EstadoCarga({ etiqueta = 'Cargando…' }: { etiqueta?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 3, color: 'text.secondary' }}>
      <CircularProgress size={18} thickness={4} />
      <Typography variant="body2">{etiqueta}</Typography>
    </Box>
  );
}
