import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material';
import { login } from '@/lib/auth/login';
import { rutaPorRol } from '@/routes/rutaPorRol';

// TEMPORAL: reemplazar cuando se integre un captcha real antes de producción.
// No hay servicio de captcha configurado en desarrollo (ver auth.service.ts
// del backend, que lo marca igual como "temporal para pruebas locales").
const DEV_CAPTCHA_BYPASS = 'DEV_CAPTCHA_BYPASS';

export default function Login() {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const data = await login(correo, password, DEV_CAPTCHA_BYPASS);
      navigate(rutaPorRol(data.usuario.rol));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 2,
      }}
    >
      <Paper component="form" onSubmit={manejarSubmit} sx={{ padding: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" gutterBottom>
          Iniciar sesión
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Correo"
          type="email"
          fullWidth
          required
          margin="normal"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          disabled={cargando}
        />
        <TextField
          label="Contraseña"
          type="password"
          fullWidth
          required
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={cargando}
        />

        <Button type="submit" variant="contained" fullWidth disabled={cargando} sx={{ mt: 2 }}>
          {cargando ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
        </Button>
      </Paper>
    </Box>
  );
}
