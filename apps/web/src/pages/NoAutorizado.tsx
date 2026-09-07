import { Box, Button, Typography } from '@mui/material';
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
