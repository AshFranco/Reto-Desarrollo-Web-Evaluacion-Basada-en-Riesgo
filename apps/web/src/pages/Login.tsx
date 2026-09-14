import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { login } from '@/lib/auth/login';
import { rutaPorRol } from '@/routes/rutaPorRol';

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
      const data = await login(correo, password);
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
        background: (t) =>
          `radial-gradient(circle at 15% 10%, ${alpha(t.palette.primary.main, 0.1)} 0%, transparent 45%),
           radial-gradient(circle at 85% 90%, ${alpha(t.palette.primary.light, 0.12)} 0%, transparent 50%)`,
      }}
    >
      <Paper
        component="form"
        onSubmit={manejarSubmit}
        variant="outlined"
        sx={{ padding: 4, width: '100%', maxWidth: 400 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
              color: 'primary.contrastText',
            }}
          >
            <ShieldOutlinedIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="overline" color="primary.main" sx={{ lineHeight: 1.1, display: 'block' }}>
              EBR / BPM
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Evaluación Basada en Riesgo
            </Typography>
          </Box>
        </Box>

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
