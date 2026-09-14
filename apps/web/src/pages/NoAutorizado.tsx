import { Box, Button, Typography } from '@mui/material';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { useNavigate } from 'react-router-dom';

export default function NoAutorizado() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
        padding: 2,
        textAlign: 'center',
      }}
    >
      <BlockOutlinedIcon sx={{ fontSize: 48, color: 'error.main', opacity: 0.7 }} />
      <Typography variant="h4">Acceso no autorizado</Typography>
      <Typography color="text.secondary">
        Tu usuario no tiene permiso para ver esta pantalla.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/login')}>
        Volver al inicio de sesión
      </Button>
    </Box>
  );
}
