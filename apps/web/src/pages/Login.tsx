import { useState, type FormEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { useQueryClient } from '@tanstack/react-query';
import { login } from '@/lib/auth/login';
import { solicitarRecuperacionContrasena } from '@/lib/auth/recuperacion';
import { rutaPorRol } from '@/routes/rutaPorRol';

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificación en dos pasos (TOTP / Google Authenticator)
  const [mfaRequerido, setMfaRequerido] = useState(false);
  const [codigoMfa, setCodigoMfa] = useState('');

  // Diálogo de recuperación de contraseña (RF-01)
  const [dialogoRecuperar, setDialogoRecuperar] = useState(false);
  const [correoRecuperacion, setCorreoRecuperacion] = useState('');
  const [recuperacionEnviada, setRecuperacionEnviada] = useState(false);
  const [cargandoRecuperar, setCargandoRecuperar] = useState(false);
  const [errorRecuperar, setErrorRecuperar] = useState<string | null>(null);
  const [previewUrlRecuperar, setPreviewUrlRecuperar] = useState<string | null>(null);

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const data = await login(correo, password, mfaRequerido ? codigoMfa : undefined);
      if (data.requiereMfa) {
        setMfaRequerido(true);
        return;
      }
      queryClient.clear();
      navigate(rutaPorRol(data.usuario.rol));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  async function handleEnviarRecuperacion() {
    if (!correoRecuperacion.trim()) return;
    setErrorRecuperar(null);
    setCargandoRecuperar(true);
    try {
      const res = await solicitarRecuperacionContrasena(correoRecuperacion.trim());
      setRecuperacionEnviada(true);
      if (res.previewUrl) {
        setPreviewUrlRecuperar(res.previewUrl);
      }
    } catch (err) {
      setErrorRecuperar(err instanceof Error ? err.message : 'Error al enviar el correo de recuperación.');
    } finally {
      setCargandoRecuperar(false);
    }
  }

  function volverLogin() {
    setMfaRequerido(false);
    setCodigoMfa('');
    setError(null);
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
        sx={{ padding: { xs: 2.5, sm: 4 }, width: '100%', maxWidth: 400 }}
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

        {mfaRequerido ? (
          <>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Verificación de seguridad
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Tu cuenta tiene activada la verificación en dos pasos. Abre tu aplicación <strong>Google Authenticator</strong> o <strong>Microsoft Authenticator</strong> en tu teléfono e ingresa el código numérico de 6 dígitos para acceder.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Código de 6 dígitos"
              fullWidth
              required
              autoFocus
              placeholder="000000"
              value={codigoMfa}
              onChange={(e) => setCodigoMfa(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{
                maxLength: 6,
                inputMode: 'numeric',
                style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.4rem', fontWeight: 700 },
              }}
              disabled={cargando}
              helperText="Código dinámico de Google Authenticator"
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={cargando || codigoMfa.length !== 6}
              sx={{ mt: 2.5 }}
            >
              {cargando ? <CircularProgress size={24} color="inherit" /> : 'Verificar y entrar'}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="text"
                size="small"
                onClick={volverLogin}
                sx={{ textTransform: 'none', fontSize: '0.85rem' }}
              >
                ← Volver al inicio de sesión
              </Button>
            </Box>
          </>
        ) : (
          <>
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

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setCorreoRecuperacion(correo);
                  setRecuperacionEnviada(false);
                  setErrorRecuperar(null);
                  setPreviewUrlRecuperar(null);
                  setDialogoRecuperar(true);
                }}
                sx={{ textTransform: 'none', fontSize: '0.85rem' }}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </Box>

            <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
              ¿No tenés cuenta?{' '}
              <Link component={RouterLink} to="/registro" underline="hover">
                Registrate
              </Link>
            </Typography>
          </>
        )}
      </Paper>

      {/* Diálogo de recuperación de contraseña (RF-01) */}
      <Dialog
        open={dialogoRecuperar}
        onClose={() => !cargandoRecuperar && setDialogoRecuperar(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Recuperar contraseña</DialogTitle>
        <DialogContent dividers>
          {errorRecuperar && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorRecuperar}
            </Alert>
          )}

          {recuperacionEnviada ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 1 }}>
              <Alert severity="success">
                Se han enviado las instrucciones de restablecimiento a <strong>{correoRecuperacion}</strong>. Si no las recibes en unos minutos, revisa tu carpeta de correo no deseado.
              </Alert>

              {previewUrlRecuperar && (
                <Box sx={{ p: 2, bgcolor: (t) => alpha(t.palette.info.main, 0.08), borderRadius: 2, border: '1px dashed', borderColor: 'info.main' }}>
                  <Typography variant="caption" color="info.dark" fontWeight={600} display="block" gutterBottom>
                    Correo emitido en servidor de prueba (Ethereal Email):
                  </Typography>
                  <Button
                    variant="outlined"
                    color="info"
                    size="small"
                    fullWidth
                    href={previewUrlRecuperar}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNewOutlinedIcon fontSize="small" />}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Abrir correo emitido en Ethereal
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Ingresa el correo electrónico asociado a tu cuenta institucional o empresarial para recibir el enlace de restablecimiento seguro.
              </Typography>
              <TextField
                label="Correo electrónico"
                type="email"
                size="small"
                fullWidth
                required
                disabled={cargandoRecuperar}
                value={correoRecuperacion}
                onChange={(e) => setCorreoRecuperacion(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoRecuperar(false)} disabled={cargandoRecuperar}>
            {recuperacionEnviada ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!recuperacionEnviada && (
            <Button
              variant="contained"
              disabled={!correoRecuperacion.trim() || cargandoRecuperar}
              onClick={handleEnviarRecuperacion}
            >
              {cargandoRecuperar ? <CircularProgress size={20} color="inherit" /> : 'Enviar instrucciones'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

