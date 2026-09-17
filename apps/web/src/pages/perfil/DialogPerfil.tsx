import { useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import WifiOffOutlinedIcon from '@mui/icons-material/WifiOffOutlined';
import WifiOutlinedIcon from '@mui/icons-material/WifiOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import { usePerfil } from '@/lib/perfil/usePerfil';
import { useCambiarContrasena } from '@/lib/perfil/useCambiarContrasena';
import { useActualizarPerfil } from '@/lib/perfil/useActualizarPerfil';
import { useFotoPerfil } from '@/lib/perfil/useFotoPerfil';
import { use2Fa, type DatosGeneracion2Fa } from '@/lib/perfil/use2Fa';
import { useSyncStatus } from '@/lib/sync/useSyncStatus';

const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador del Sistema',
  COORDINADOR: 'Coordinador de Calidad',
  TECNICO_EVALUADOR: 'Técnico Evaluador',
  ADMINISTRADOR_EMPRESA: 'Administrador de Empresa',
  USUARIO_DELEGADO: 'Usuario Delegado',
};

const COLOR_ROL: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'> = {
  ADMINISTRADOR: 'error',
  COORDINADOR: 'secondary',
  TECNICO_EVALUADOR: 'primary',
  ADMINISTRADOR_EMPRESA: 'success',
  USUARIO_DELEGADO: 'info',
};

interface Props {
  open: boolean;
  onClose: () => void;
  rolActivo: string;
  usuarioSesion?: { id: string; nombreCompleto: string; rol: string; empresaId: string | null } | null;
}

// ── Pestaña 1: Información del perfil y contacto ─────────────────────────────
function TabInformacion({
  rolActivo,
  usuarioSesion,
}: {
  rolActivo: string;
  usuarioSesion?: Props['usuarioSesion'];
}) {
  const { perfil, cargando, error } = usePerfil(usuarioSesion?.id);
  const sync = useSyncStatus();
  const actualizarPerfil = useActualizarPerfil();

  // Validación estricta: sólo se usan datos de perfil si coincide con el usuario activo en sesión
  const perfilCoincide = perfil && (!usuarioSesion || String(perfil.id) === String(usuarioSesion.id));
  const datosValidos = perfilCoincide ? perfil : null;

  const datos = datosValidos ?? (usuarioSesion ? {
    id: usuarioSesion.id,
    nombreCompleto: usuarioSesion.nombreCompleto,
    correoElectronico: null,
    telefono: null,
    roles: [usuarioSesion.rol],
    idEmpresa: usuarioSesion.empresaId,
    dobleFactorActivo: false,
  } : null);

  const esOffline = !sync.enLinea || Boolean(error && datos);
  const idUsuario = datosValidos?.id ?? usuarioSesion?.id;
  const [fotoUrl, actualizarFoto] = useFotoPerfil(idUsuario);

  const [telefono, setTelefono] = useState('');
  const [exitoGuardar, setExitoGuardar] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  // Inicializar teléfono con datos de perfil y resetear al cambiar de usuario
  useEffect(() => {
    setTelefono(datos?.telefono ?? '');
    setExitoGuardar(false);
    setErrorGuardar(null);
  }, [datos?.id, datos?.telefono]);

  function handleSubirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        actualizarFoto(b64);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleQuitarFoto() {
    actualizarFoto(null);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setExitoGuardar(false);
    setErrorGuardar(null);
    try {
      await actualizarPerfil.mutateAsync({
        telefono: telefono.trim(),
      });
      setExitoGuardar(true);
    } catch (err) {
      setErrorGuardar(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    }
  }

  const iniciales = (datos?.nombreCompleto ?? usuarioSesion?.nombreCompleto)
    ?.split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  if (error && !datos) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        No se pudieron cargar los datos del perfil. Intenta más tarde.
      </Alert>
    );
  }

  return (
    <Box component="form" onSubmit={handleGuardar} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {esOffline && (
        <Alert
          severity="info"
          icon={<WifiOffOutlinedIcon fontSize="inherit" />}
          sx={{ py: 0.5 }}
        >
          Modo sin conexión: mostrando datos de sesión guardados en este dispositivo.
        </Alert>
      )}

      {/* ── Encabezado de perfil y foto ── */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2.5,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
          borderColor: (t) => alpha(t.palette.primary.main, 0.15),
          borderRadius: 2.5,
        }}
      >
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <Tooltip title="Cambiar foto de perfil">
              <IconButton
                component="label"
                size="small"
                aria-label="cambiar foto de perfil"
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  width: 28,
                  height: 28,
                  boxShadow: 2,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <PhotoCameraOutlinedIcon sx={{ fontSize: 16 }} />
                <input type="file" accept="image/*" hidden onChange={handleSubirFoto} />
              </IconButton>
            </Tooltip>
          }
        >
          <Avatar
            src={fotoUrl ?? undefined}
            sx={{
              width: 72,
              height: 72,
              bgcolor: 'primary.main',
              fontSize: '1.75rem',
              fontWeight: 700,
              boxShadow: 1,
            }}
          >
            {cargando && !datos ? '' : iniciales}
          </Avatar>
        </Badge>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {cargando && !datos ? (
            <>
              <Skeleton width={180} height={28} />
              <Skeleton width={120} height={20} sx={{ mt: 0.5 }} />
            </>
          ) : (
            <>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2} noWrap>
                {datos?.nombreCompleto}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                <Chip
                  label={ETIQUETA_ROL[rolActivo] ?? rolActivo}
                  color={COLOR_ROL[rolActivo] ?? 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                {fotoUrl && (
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<DeleteOutlineOutlinedIcon fontSize="small" />}
                    onClick={handleQuitarFoto}
                    sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0, minWidth: 'auto', color: 'text.secondary' }}
                  >
                    Quitar foto
                  </Button>
                )}
              </Box>
            </>
          )}
        </Box>
      </Paper>

      {/* ── Formulario de datos de contacto ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
          Datos de la cuenta y contacto
        </Typography>

        <TextField
          label="Nombre completo"
          value={datos?.nombreCompleto ?? ''}
          fullWidth
          size="small"
          disabled
          helperText="El nombre oficial es gestionado por la administración del sistema."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Correo electrónico institucional"
          value={datos?.correoElectronico ?? ''}
          fullWidth
          size="small"
          disabled
          helperText="Identificador único para inicio de sesión y notificaciones."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <LockOutlinedIcon fontSize="small" color="disabled" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Teléfono de contacto"
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value);
            setExitoGuardar(false);
          }}
          placeholder="Ej: 809-555-1234"
          fullWidth
          size="small"
          helperText="Número de teléfono donde los coordinadores y empresas pueden contactarte."
          disabled={actualizarPerfil.isPending || !sync.enLinea}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        {datos?.idEmpresa && (
          <TextField
            label="Empresa vinculada (ID)"
            value={datos.idEmpresa}
            fullWidth
            size="small"
            disabled
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BusinessOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        )}
      </Box>

      {/* ── Mensajes de confirmación ── */}
      {exitoGuardar && (
        <Alert severity="success" sx={{ py: 0.5 }}>
          Información de contacto guardada correctamente.
        </Alert>
      )}

      {errorGuardar && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {errorGuardar}
        </Alert>
      )}

      {/* ── Botón Guardar Cambios ── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={actualizarPerfil.isPending || !sync.enLinea}
          startIcon={
            actualizarPerfil.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SaveOutlinedIcon fontSize="small" />
            )
          }
        >
          {actualizarPerfil.isPending ? 'Guardando cambios...' : 'Guardar cambios'}
        </Button>
      </Box>
    </Box>
  );
}

function TabSeguridad({
  rolActivo,
  usuarioSesion,
}: {
  rolActivo: string;
  usuarioSesion?: Props['usuarioSesion'];
}) {
  const { cambiar, cargando, error, exito, resetExito, reset } = useCambiarContrasena();
  const { perfil, refetch } = usePerfil(usuarioSesion?.id);
  const sync = useSyncStatus();
  const { generarQr, activar, estaActivando, desactivar, estaDesactivando } = use2Fa();

  // Estados para 2FA Real (Google Authenticator)
  const [dialogoConfigurar2Fa, setDialogoConfigurar2Fa] = useState(false);
  const [datosQr, setDatosQr] = useState<DatosGeneracion2Fa | null>(null);
  const [cargandoQr, setCargandoQr] = useState(false);
  const [errorQr, setErrorQr] = useState<string | null>(null);
  const [codigoConfirmacion, setCodigoConfirmacion] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [exito2Fa, setExito2Fa] = useState(false);

  const [dialogoDesactivar2Fa, setDialogoDesactivar2Fa] = useState(false);
  const [claveParaDesactivar, setClaveParaDesactivar] = useState('');
  const [errorDesactivarLocal, setErrorDesactivarLocal] = useState<string | null>(null);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Limpiar formulario al tener éxito o al cambiar de usuario
  useEffect(() => {
    setActual('');
    setNueva('');
    setConfirmar('');
    setErrorLocal(null);
    setDialogoConfigurar2Fa(false);
    setDialogoDesactivar2Fa(false);
    setClaveParaDesactivar('');
    setErrorDesactivarLocal(null);
    resetExito();
    reset();
  }, [usuarioSesion?.id]);

  useEffect(() => {
    if (exito) {
      setActual('');
      setNueva('');
      setConfirmar('');
      setErrorLocal(null);
    }
  }, [exito]);

  async function abrirConfigurar2Fa() {
    setErrorQr(null);
    setCodigoConfirmacion('');
    setCargandoQr(true);
    setDialogoConfigurar2Fa(true);
    try {
      const res = await generarQr();
      setDatosQr(res);
    } catch (err) {
      setErrorQr(err instanceof Error ? err.message : 'Error al generar código QR.');
    } finally {
      setCargandoQr(false);
    }
  }

  async function handleActivar2Fa() {
    if (!datosQr || codigoConfirmacion.length !== 6) return;
    setErrorQr(null);
    try {
      await activar({ secreto: datosQr.secreto, codigo: codigoConfirmacion });
      setExito2Fa(true);
      await refetch();
      setTimeout(() => {
        setDialogoConfigurar2Fa(false);
        setExito2Fa(false);
      }, 1500);
    } catch (err) {
      setErrorQr(err instanceof Error ? err.message : 'Error al activar verificación en dos pasos.');
    }
  }

  function copiarClave() {
    if (datosQr?.secreto) {
      navigator.clipboard.writeText(datosQr.secreto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  async function handleConfirmarDesactivar() {
    if (!claveParaDesactivar) return;
    setErrorDesactivarLocal(null);
    try {
      await desactivar({ contrasenaActual: claveParaDesactivar });
      await refetch();
      setDialogoDesactivar2Fa(false);
      setClaveParaDesactivar('');
    } catch (err) {
      setErrorDesactivarLocal(err instanceof Error ? err.message : 'Error al desactivar la protección.');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorLocal(null);
    resetExito();
    reset();

    if (nueva.length < 8) {
      setErrorLocal('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      setErrorLocal('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    if (nueva === actual) {
      setErrorLocal('La nueva contraseña no puede ser igual a la contraseña actual.');
      return;
    }

    cambiar({ contrasenaActual: actual, contrasenaNueva: nueva, confirmacion: confirmar });
  }

  const mensajeError = errorLocal ?? error;
  const perfilCoincide = perfil && (!usuarioSesion || String(perfil.id) === String(usuarioSesion.id));
  const dosPasosActivo = perfilCoincide ? (perfil.dobleFactorActivo ?? false) : false;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── 1. Verificación de seguridad en dos pasos (Google Authenticator) ── */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 2.5,
          bgcolor: (t) => (dosPasosActivo ? alpha(t.palette.success.main, 0.04) : alpha(t.palette.grey[500], 0.04)),
          borderColor: (t) => (dosPasosActivo ? alpha(t.palette.success.main, 0.3) : 'divider'),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (t) => (dosPasosActivo ? alpha(t.palette.success.main, 0.12) : alpha(t.palette.primary.main, 0.1)),
                color: dosPasosActivo ? 'success.main' : 'primary.main',
              }}
            >
              {dosPasosActivo ? <GppGoodOutlinedIcon fontSize="medium" /> : <SecurityOutlinedIcon fontSize="medium" />}
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                Verificación en dos pasos (Google Authenticator)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Estándar TOTP (RFC 6238)
              </Typography>
            </Box>
          </Box>
          <Chip
            label={dosPasosActivo ? 'Protegida' : 'Desactivada'}
            color={dosPasosActivo ? 'success' : 'default'}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {dosPasosActivo ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              Tu cuenta está protegida. Al iniciar sesión se requerirá el código dinámico de 6 dígitos emitido por tu aplicación móvil Google Authenticator o Microsoft Authenticator.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                disabled={!sync.enLinea}
                onClick={() => {
                  setClaveParaDesactivar('');
                  setErrorDesactivarLocal(null);
                  setDialogoDesactivar2Fa(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Desactivar verificación en dos pasos
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              Añade una capa de máxima seguridad a tu cuenta. Escanea un código QR con tu aplicación móvil <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> o cualquier aplicación TOTP compatible.
            </Typography>
            <Box sx={{ pt: 1 }}>
              <Button
                variant="contained"
                color="primary"
                size="medium"
                startIcon={<QrCode2OutlinedIcon />}
                disabled={!sync.enLinea}
                onClick={abrirConfigurar2Fa}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Configurar Google Authenticator
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Modal para configurar Google Authenticator */}
      <Dialog
        open={dialogoConfigurar2Fa}
        onClose={() => !estaActivando && setDialogoConfigurar2Fa(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <QrCode2OutlinedIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Configurar Google Authenticator
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogoConfigurar2Fa(false)} size="small" disabled={estaActivando}>
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {cargandoQr ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
              <CircularProgress size={36} />
              <Typography variant="body2" color="text.secondary">
                Generando clave criptográfica y código QR...
              </Typography>
            </Box>
          ) : exito2Fa ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1.5 }}>
              <CheckCircleOutlineIcon color="success" sx={{ fontSize: 52 }} />
              <Typography variant="h6" fontWeight={700} color="success.main">
                ¡Protección en dos pasos activada!
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Tu cuenta ha quedado formalmente vinculada a Google Authenticator.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {errorQr && <Alert severity="error">{errorQr}</Alert>}

              <Typography variant="body2" color="text.secondary">
                Sigue estos pasos en tu dispositivo móvil:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, alignItems: 'center', bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
                {datosQr?.qrCode && (
                  <Box sx={{ bgcolor: '#ffffff', p: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={datosQr.qrCode} alt="Código QR TOTP" style={{ width: 170, height: 170, display: 'block' }} />
                  </Box>
                )}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Paso 1: Escanea este código QR
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Abre <strong>Google Authenticator</strong> en tu celular, pulsa <strong>'+'</strong> y elige <strong>Escanear un código QR</strong>.
                  </Typography>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    ¿No puedes escanear? Ingresa esta clave:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      size="small"
                      value={datosQr?.secreto ?? ''}
                      InputProps={{ readOnly: true, style: { fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 600 } }}
                      fullWidth
                    />
                    <Tooltip title={copiado ? '¡Copiado!' : 'Copiar clave'}>
                      <IconButton onClick={copiarClave} size="small" color={copiado ? 'success' : 'default'}>
                        {copiado ? <CheckOutlinedIcon fontSize="small" /> : <ContentCopyOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Paso 2: Ingresa el código de confirmación
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Escribe los 6 dígitos que muestra Google Authenticator para verificar la vinculación:
                </Typography>

                <TextField
                  label="Código de 6 dígitos"
                  placeholder="000000"
                  size="small"
                  autoFocus
                  value={codigoConfirmacion}
                  onChange={(e) => setCodigoConfirmacion(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{
                    maxLength: 6,
                    inputMode: 'numeric',
                    style: { textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.3rem', fontWeight: 700 },
                  }}
                  fullWidth
                  disabled={estaActivando}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        {!exito2Fa && (
          <DialogActions>
            <Button onClick={() => setDialogoConfigurar2Fa(false)} disabled={estaActivando}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={estaActivando || cargandoQr || codigoConfirmacion.length !== 6}
              onClick={handleActivar2Fa}
            >
              {estaActivando ? <CircularProgress size={20} color="inherit" /> : 'Verificar y activar'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Modal para desactivar 2FA */}
      <Dialog
        open={dialogoDesactivar2Fa}
        onClose={() => !estaDesactivando && setDialogoDesactivar2Fa(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Desactivar verificación en dos pasos</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="warning">
              Al desactivar esta opción tu cuenta quedará protegida únicamente con tu contraseña.
            </Alert>
            {errorDesactivarLocal && <Alert severity="error">{errorDesactivarLocal}</Alert>}
            <Typography variant="body2" color="text.secondary">
              Para confirmar que eres el propietario de la cuenta, ingresa tu contraseña actual:
            </Typography>
            <TextField
              label="Contraseña actual"
              type="password"
              size="small"
              fullWidth
              required
              value={claveParaDesactivar}
              onChange={(e) => setClaveParaDesactivar(e.target.value)}
              disabled={estaDesactivando}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoDesactivar2Fa(false)} disabled={estaDesactivando}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!claveParaDesactivar || estaDesactivando}
            onClick={handleConfirmarDesactivar}
          >
            {estaDesactivando ? <CircularProgress size={20} color="inherit" /> : 'Desactivar protección'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 2. Cambio de contraseña de acceso ── */}
      <Box>
        <Typography variant="subtitle2" fontWeight={700} mb={1}>
          Contraseña de acceso
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Actualiza tu clave periódicamente para mantener tu cuenta segura.
        </Typography>

        {exito ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 3 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 44 }} />
            <Typography variant="body1" fontWeight={600} color="success.main">
              ¡Contraseña actualizada!
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Tu contraseña fue cambiada correctamente. Las sesiones abiertas en otros dispositivos se cerraron por seguridad.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => { resetExito(); reset(); }}
              sx={{ mt: 1 }}
            >
              Cambiar contraseña nuevamente
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Contraseña actual"
              type={mostrarActual ? 'text' : 'password'}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              size="small"
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setMostrarActual((v) => !v)} edge="end">
                      {mostrarActual ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Nueva contraseña"
              type={mostrarNueva ? 'text' : 'password'}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              size="small"
              required
              autoComplete="new-password"
              helperText="Mínimo 8 caracteres"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setMostrarNueva((v) => !v)} edge="end">
                      {mostrarNueva ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirmar nueva contraseña"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              size="small"
              required
              autoComplete="new-password"
              error={confirmar.length > 0 && nueva !== confirmar}
              helperText={confirmar.length > 0 && nueva !== confirmar ? 'No coincide con la nueva contraseña' : ''}
            />

            {mensajeError && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                {mensajeError}
              </Alert>
            )}

            {!sync.enLinea && (
              <Alert
                severity="warning"
                icon={<WifiOffOutlinedIcon fontSize="inherit" />}
                sx={{ py: 0.5 }}
              >
                Conéctate a internet para cambiar tu contraseña. Esta acción no está disponible sin conexión por motivos de seguridad.
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={!sync.enLinea || cargando || !actual || !nueva || !confirmar}
                startIcon={cargando ? <CircularProgress size={16} color="inherit" /> : <LockOutlinedIcon />}
              >
                {cargando ? 'Guardando...' : 'Actualizar contraseña'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── 3. Estado de la Aplicación (solo técnico evaluador) ── */}
      {rolActivo === 'TECNICO_EVALUADOR' && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.background.paper, 0.6) }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            Disponibilidad de la aplicación en campo
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Estado de sincronización y operatividad offline para fichas de evaluación.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {sync.enLinea ? (
                <WifiOutlinedIcon color="success" fontSize="small" />
              ) : (
                <WifiOffOutlinedIcon color="error" fontSize="small" />
              )}
              <Typography variant="body2">
                Conexión:{' '}
                <strong style={{ color: sync.enLinea ? '#2e7d32' : '#c62828' }}>
                  {sync.enLinea ? 'En línea' : 'Sin conexión'}
                </strong>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SyncOutlinedIcon fontSize="small" color="action" />
              <Typography variant="body2">
                Evaluaciones pendientes de sincronización:{' '}
                <strong>{sync.pendientes}</strong>
              </Typography>
            </Box>

            {sync.pendientes > 0 && sync.enLinea && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<SyncOutlinedIcon />}
                onClick={() => void sync.sincronizar()}
                sx={{ alignSelf: 'flex-start', mt: 0.5 }}
              >
                Sincronizar ahora
              </Button>
            )}
            {sync.pendientes > 0 && !sync.enLinea && (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                Se sincronizará automáticamente cuando se restablezca la conexión.
              </Alert>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

// ── Componente principal: DialogPerfil ────────────────────────────────────────
export function DialogPerfil({ open, onClose, rolActivo, usuarioSesion }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [tab, setTab] = useState(0);

  function handleClose() {
    setTab(0);
    onClose();
  }

  const inicialRol = ETIQUETA_ROL[rolActivo]?.[0] ?? rolActivo[0] ?? '?';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 3 } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Tooltip title={ETIQUETA_ROL[rolActivo] ?? rolActivo}>
          <Avatar
            sx={{
              bgcolor: COLOR_ROL[rolActivo] ? `${COLOR_ROL[rolActivo]}.main` : 'primary.main',
              width: 36,
              height: 36,
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            {inicialRol}
          </Avatar>
        </Tooltip>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            Mi perfil
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Configuración de tu cuenta y seguridad
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} aria-label="cerrar">
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          variant="fullWidth"
          sx={{ minHeight: 48 }}
        >
          <Tab
            icon={<PersonOutlinedIcon fontSize="small" />}
            iconPosition="start"
            label="Información y contacto"
            sx={{ minHeight: 48, fontSize: '0.82rem', textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            icon={<SecurityOutlinedIcon fontSize="small" />}
            iconPosition="start"
            label="Seguridad y acceso"
            sx={{ minHeight: 48, fontSize: '0.82rem', textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 4 }}>
        {tab === 0 && <TabInformacion rolActivo={rolActivo} usuarioSesion={usuarioSesion} />}
        {tab === 1 && <TabSeguridad rolActivo={rolActivo} usuarioSesion={usuarioSesion} />}
      </DialogContent>
    </Dialog>
  );
}
