import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, CircularProgress, TextField, Typography, Alert, Paper,
} from '@mui/material';
import { saveSession } from '@/lib/auth/session';
import { descargarCatalogo } from '@/lib/catalogo/loader';
import type { LoginResponse } from '@/lib/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export default function LoginPage() {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // captchaToken: pendiente integrar hCaptcha widget en producción
        body: JSON.stringify({ correo, password, captchaToken: '' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { message?: string }).message ?? `Error ${res.status}`);
        return;
      }

      const data: LoginResponse = await res.json();
      await saveSession(data);
      await descargarCatalogo();
      navigate('/app', { replace: true });
    } catch {
      setError('No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'grey.100' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight={700} mb={1}>EBR / BPM</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Evaluación Basada en Riesgo — DIGEMAPS
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Correo institucional"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            fullWidth required autoFocus
            sx={{ mb: 2 }}
            inputProps={{ 'data-testid': 'correo' }}
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth required
            sx={{ mb: 3 }}
            inputProps={{ 'data-testid': 'password' }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={cargando || !correo || !password}
            data-testid="btn-login"
          >
            {cargando ? <CircularProgress size={22} color="inherit" /> : 'Iniciar sesión'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
