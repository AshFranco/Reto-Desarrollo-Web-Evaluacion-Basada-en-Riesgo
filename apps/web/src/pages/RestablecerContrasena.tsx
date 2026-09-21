import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import { restablecerContrasena } from '@/lib/auth/recuperacion';
import { LogoSinec } from '@/components/ui/LogoSinec';

export default function RestablecerContrasena() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (!token) {
      setError('El enlace no incluye un token de autorización válido.');
      return;
    }

    if (nuevaContrasena.length < 8) {
      setError('La nueva contraseña debe contener al menos 8 caracteres.');
      return;
    }

    if (nuevaContrasena !== confirmacion) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      await restablecerContrasena(token, nuevaContrasena, confirmacion);
      setExito(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña.');
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
        variant="outlined"
        sx={{ padding: 4, width: '100%', maxWidth: 440, borderRadius: 3 }}
      >
        {/* Encabezado institucional */}
        <LogoSinec subtitulo="Seguridad y control de acceso" />

        {exito ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 2 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: (t) => alpha(t.palette.success.main, 0.12),
                color: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <CheckCircleOutlineIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              ¡Contraseña restablecida!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360 }}>
              Tu clave de acceso ha sido actualizada exitosamente. Ya puedes ingresar al sistema con tu nueva contraseña.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => navigate('/login')}
              sx={{ py: 1.2 }}
            >
              Ir a Iniciar Sesión
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
              <LockResetOutlinedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Restablecer contraseña
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Ingresa una nueva contraseña segura para tu cuenta institucional o empresarial.
            </Typography>

            {!token && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                No se encontró un token válido en el enlace. Solicita un nuevo enlace desde la pantalla de inicio de sesión.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={manejarSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Nueva contraseña"
                type={mostrarNueva ? 'text' : 'password'}
                fullWidth
                required
                disabled={!token || cargando}
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                helperText="Mínimo 8 caracteres"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setMostrarNueva((v) => !v)}
                        edge="end"
                        tabIndex={-1}
                      >
                        {mostrarNueva ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Confirmar nueva contraseña"
                type={mostrarConfirmacion ? 'text' : 'password'}
                fullWidth
                required
                disabled={!token || cargando}
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                error={confirmacion.length > 0 && confirmacion !== nuevaContrasena}
                helperText={
                  confirmacion.length > 0 && confirmacion !== nuevaContrasena
                    ? 'Las contraseñas no coinciden'
                    : ''
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setMostrarConfirmacion((v) => !v)}
                        edge="end"
                        tabIndex={-1}
                      >
                        {mostrarConfirmacion ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={!token || cargando || nuevaContrasena.length < 8 || nuevaContrasena !== confirmacion}
                sx={{ mt: 1, py: 1.2 }}
              >
                {cargando ? <CircularProgress size={24} color="inherit" /> : 'Guardar nueva contraseña'}
              </Button>

              <Button
                variant="text"
                size="small"
                onClick={() => navigate('/login')}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                ← Volver al inicio de sesión
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
