import { Box, Typography } from '@mui/material';
import logoCompleto from '@/assets/logo-completo.png';

/**
 * Logotipo completo (escudo + "SINEC" + subtítulos) para las pantallas sin
 * barra de navegación. El archivo está recortado a su contenido real y se
 * muestra a ~320 px de ancho: a ese tamaño el texto pequeño del logotipo
 * sigue siendo legible, cosa que no pasaba al encajarlo en un cuadro de
 * 48 px. `subtitulo` es opcional, para pantallas con un rótulo propio.
 */
export function LogoSinec({ subtitulo }: { subtitulo?: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 3 }}>
      <Box
        component="img"
        src={logoCompleto}
        alt="SINEC — Sistema de Evaluación y BPM"
        sx={{ width: '100%', maxWidth: 320, height: 'auto' }}
      />
      {subtitulo && (
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
          {subtitulo}
        </Typography>
      )}
    </Box>
  );
}
