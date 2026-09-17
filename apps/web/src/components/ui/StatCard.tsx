import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

/** Tarjeta de estadística con el patrón ícono + número + etiqueta, usada en todos los dashboards. */
export function StatCard({
  icono,
  valor,
  etiqueta,
  color = '#2A6DB0',
}: {
  icono: ReactNode;
  valor: string | number;
  etiqueta: string;
  color?: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flex: { xs: '1 1 100%', sm: '1 1 200px' },
        borderLeft: '3px solid',
        borderLeftColor: color,
        bgcolor: alpha(color, 0.035),
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          bgcolor: alpha(color, 0.16),
          color,
        }}
      >
        {icono}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" fontWeight={700} lineHeight={1.2} color="text.primary">
          {valor}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
          {etiqueta}
        </Typography>
      </Box>
    </Paper>
  );
}
