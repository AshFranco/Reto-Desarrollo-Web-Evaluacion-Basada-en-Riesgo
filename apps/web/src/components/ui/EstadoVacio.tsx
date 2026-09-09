import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

/** Estado vacío consistente (icono grande sobre una insignia de color + mensaje), para reemplazar el texto plano suelto en listas y tablas sin datos. */
export function EstadoVacio({ titulo, icono }: { titulo: string; icono?: ReactNode }) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 5,
        px: 2,
        borderRadius: 3,
        bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 1.5,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
          color: 'primary.main',
          '& .MuiSvgIcon-root': { fontSize: '34px !important' },
        }}
      >
        {icono ?? <InboxOutlinedIcon />}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {titulo}
      </Typography>
    </Box>
  );
}
