import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * Encabezado de pantalla consistente: etiqueta pequeña en mayúsculas sobre
 * un título grande (patrón usado en todos los dashboards y pantallas
 * principales), con espacio opcional para una acción a la derecha y un
 * ícono opcional con una insignia de color que le da algo de presencia
 * visual (en vez de ser solo texto plano sobre blanco).
 */
export function PageHeader({
  etiqueta,
  titulo,
  accion,
  icono,
}: {
  etiqueta: string;
  titulo: string;
  accion?: ReactNode;
  icono?: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
        {icono && (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
              color: 'primary.main',
            }}
          >
            {icono}
          </Box>
        )}
        <Box>
          <Typography variant="overline" color="primary.main">
            {etiqueta}
          </Typography>
          <Typography variant="h4">{titulo}</Typography>
        </Box>
      </Box>
      {accion}
    </Box>
  );
}
