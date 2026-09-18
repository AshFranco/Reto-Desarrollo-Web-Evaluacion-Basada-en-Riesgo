import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import {
  useRegistrosPendientes,
  useResolverRegistro,
  type UsuarioPendiente,
} from '@/lib/admin/useRegistrosPendientes';
import {
  useUsuariosTodos,
  useActualizarRolUsuario,
  useActualizarEstadoUsuario,
  useTiposEstablecimientoAdmin,
  useCrearTipoEstablecimiento,
  useActualizarTipoEstablecimiento,
  type UsuarioSistema,
  type TipoEstablecimientoAdmin,
} from '@/lib/admin/useGestionAdmin';
import { useCasos } from '@/lib/coordinador/useCasos';

const ROLES_DISPONIBLES = [
  { codigo: 'ADMINISTRADOR', nombre: 'Administrador del Sistema' },
  { codigo: 'COORDINADOR', nombre: 'Coordinador de Calidad' },
  { codigo: 'TECNICO_EVALUADOR', nombre: 'Técnico Evaluador' },
  { codigo: 'ADMINISTRADOR_EMPRESA', nombre: 'Administrador de Empresa' },
  { codigo: 'EMPRESA', nombre: 'Usuario Delegado Empresa' },
];

/** Configuración de etiquetas y estilos sutiles para estados de cuenta de usuario (Cero colores estridentes/mamei). */
const CONFIG_ESTADO_USUARIO: Record<
  string,
  { label: string; bg: string; border: string; color: string }
> = {
  APROBADO: {
    label: 'Aprobado',
    bg: 'rgba(46, 125, 50, 0.08)',
    border: 'rgba(46, 125, 50, 0.3)',
    color: '#1B5E20',
  },
  PENDIENTE_VALIDACION: {
    label: 'Pendiente de validación',
    bg: 'rgba(71, 85, 105, 0.08)',
    border: 'rgba(71, 85, 105, 0.25)',
    color: '#334155',
  },
  BLOQUEADO: {
    label: 'Bloqueado',
    bg: 'rgba(198, 40, 40, 0.08)',
    border: 'rgba(198, 40, 40, 0.3)',
    color: '#B71C1C',
  },
  INACTIVO: {
    label: 'Inactivo',
    bg: 'rgba(100, 116, 139, 0.08)',
    border: 'rgba(100, 116, 139, 0.25)',
    color: '#475569',
  },
  RECHAZADO: {
    label: 'Rechazado',
    bg: 'rgba(198, 40, 40, 0.08)',
    border: 'rgba(198, 40, 40, 0.3)',
    color: '#B71C1C',
  },
};

function ResumenAdmin({
  totalPendientes,
  totalUsuarios,
  totalTipos,
  totalCasos,
}: {
  totalPendientes: number;
  totalUsuarios: number;
  totalTipos: number;
  totalCasos: number;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <StatCard
        icono={<HowToRegOutlinedIcon />}
        valor={totalPendientes}
        etiqueta="Usuarios por aprobar"
        color={totalPendientes > 0 ? '#475569' : '#2E7D32'}
      />
      <StatCard
        icono={<GroupOutlinedIcon />}
        valor={totalUsuarios}
        etiqueta="Usuarios registrados"
        color="#2A6DB0"
      />
      <StatCard
        icono={<CategoryOutlinedIcon />}
        valor={totalTipos}
        etiqueta="Tipos de establecimiento"
        color="#0288D1"
      />
      <StatCard
        icono={<FolderOutlinedIcon />}
        valor={totalCasos}
        etiqueta="Casos en el sistema"
        color="#1E3A8A"
      />
    </Box>
  );
}

// ---------------------------------------------------------------------
// TAB 0: Centro de Aprobación de Usuarios
// ---------------------------------------------------------------------
function DialogoRechazo({
  usuario,
  open,
  onClose,
}: {
  usuario: UsuarioPendiente | null;
  open: boolean;
  onClose: () => void;
}) {
  const resolver = useResolverRegistro();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function confirmarRechazo() {
    if (!usuario) return;
    if (!motivo.trim()) {
      setError('Debes ingresar el motivo del rechazo.');
      return;
    }
    setError(null);
    try {
      await resolver.mutateAsync({
        id: usuario.id,
        decision: 'RECHAZADO',
        motivoRechazo: motivo.trim(),
      });
      setMotivo('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar el usuario');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rechazar registro de usuario</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Indica la razón por la cual se rechaza la solicitud de <strong>{usuario?.nombreCompleto}</strong> ({usuario?.correoElectronico}):
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Motivo del rechazo"
          placeholder="Ej: La documentación de la empresa no coincide con los registros oficiales de DGII."
          fullWidth
          multiline
          rows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          color="error"
          onClick={confirmarRechazo}
          disabled={resolver.isPending || !motivo.trim()}
        >
          {resolver.isPending ? <CircularProgress size={16} /> : 'Confirmar rechazo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Enlace a la carta de autorización (RF-02) — el admin debe poder revisarla antes de aprobar/rechazar, no aprobar a ciegas. */
function EnlaceCartaAutorizacion({ url }: { url: string | null }) {
  if (!url) {
    return (
      <Typography variant="caption" color="text.secondary">
        Sin carta de autorización adjunta
      </Typography>
    );
  }
  return (
    <Button
      size="small"
      variant="text"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      startIcon={<DescriptionOutlinedIcon fontSize="small" />}
      endIcon={<OpenInNewOutlinedIcon fontSize="small" />}
      sx={{ textTransform: 'none', px: 0.5 }}
    >
      Ver carta de autorización
    </Button>
  );
}

function TarjetaUsuarioPendiente({
  usuario,
  onAprobar,
  onRechazar,
  deshabilitado,
}: {
  usuario: UsuarioPendiente;
  onAprobar: (id: string) => void;
  onRechazar: (u: UsuarioPendiente) => void;
  deshabilitado: boolean;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {usuario.nombreCompleto}
        </Typography>
        <Chip
          label={usuario.roles.join(', ') || 'Sin rol'}
          size="small"
          variant="outlined"
          sx={{ borderColor: 'rgba(15, 23, 42, 0.20)', color: 'text.secondary' }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {usuario.correoElectronico}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Cédula/Pasaporte: {usuario.cedulaPasaporte} · Teléfono: {usuario.telefono ?? 'No indicado'}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Fecha solicitud: {new Date(usuario.fechaCreacion).toLocaleDateString()}
      </Typography>
      <EnlaceCartaAutorizacion url={usuario.cartaAutorizacionUrl} />
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button
          size="small"
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<CheckCircleOutlineIcon fontSize="small" />}
          disabled={deshabilitado}
          onClick={() => onAprobar(usuario.id)}
        >
          Aprobar
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          fullWidth
          startIcon={<CancelOutlinedIcon fontSize="small" />}
          disabled={deshabilitado}
          onClick={() => onRechazar(usuario)}
        >
          Rechazar
        </Button>
      </Box>
    </Paper>
  );
}

function TablaUsuariosPendientes() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: pendientes, isLoading, isError, error } = useRegistrosPendientes();
  const resolver = useResolverRegistro();
  const [usuarioRechazo, setUsuarioRechazo] = useState<UsuarioPendiente | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  if (isLoading) return <EstadoCarga etiqueta="Cargando solicitudes pendientes…" />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar usuarios pendientes'}</Alert>;
  }
  if (!pendientes || pendientes.length === 0) {
    return (
      <EstadoVacio
        titulo="No hay registros pendientes de validación."
        icono={<CheckCircleOutlineIcon fontSize="large" color="success" />}
      />
    );
  }

  async function handleAprobar(id: string) {
    setErrorAccion(null);
    try {
      await resolver.mutateAsync({ id, decision: 'APROBADO' });
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'Error al aprobar el registro');
    }
  }

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Aprobación de usuarios
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Revisa y valida las solicitudes de registro de cuentas pendientes en la plataforma.
        </Typography>
      </Box>

      {errorAccion && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorAccion}
        </Alert>
      )}

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {pendientes.map((u) => (
            <TarjetaUsuarioPendiente
              key={u.id}
              usuario={u}
              onAprobar={handleAprobar}
              onRechazar={(u) => setUsuarioRechazo(u)}
              deshabilitado={resolver.isPending}
            />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre completo</TableCell>
                <TableCell>Correo electrónico</TableCell>
                <TableCell>Cédula/Pasaporte</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Carta de autorización</TableCell>
                <TableCell>Rol solicitado</TableCell>
                <TableCell>Fecha solicitud</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendientes.map((u) => (
                <TableRow key={u.id}>
                  <TableCell><strong>{u.nombreCompleto}</strong></TableCell>
                  <TableCell>{u.correoElectronico}</TableCell>
                  <TableCell>{u.cedulaPasaporte}</TableCell>
                  <TableCell>{u.telefono ?? '—'}</TableCell>
                  <TableCell>
                    <EnlaceCartaAutorizacion url={u.cartaAutorizacionUrl} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.roles.join(', ') || 'Sin rol'}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: 'rgba(15, 23, 42, 0.20)', color: 'text.secondary' }}
                    />
                  </TableCell>
                  <TableCell>{new Date(u.fechaCreacion).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<CheckCircleOutlineIcon fontSize="small" />}
                        disabled={resolver.isPending}
                        onClick={() => handleAprobar(u.id)}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CancelOutlinedIcon fontSize="small" />}
                        disabled={resolver.isPending}
                        onClick={() => setUsuarioRechazo(u)}
                      >
                        Rechazar
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <DialogoRechazo
        usuario={usuarioRechazo}
        open={Boolean(usuarioRechazo)}
        onClose={() => setUsuarioRechazo(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------
// TAB 1: Gestión de Usuarios y Roles (Blindaje de Administrador y Badges Pulidos)
// ---------------------------------------------------------------------
function TarjetaGestionUsuario({
  usuario,
  onEditarRol,
  onToggleEstado,
  actualizandoEstado,
}: {
  usuario: UsuarioSistema;
  onEditarRol: (u: UsuarioSistema) => void;
  onToggleEstado: (u: UsuarioSistema) => void;
  actualizandoEstado: boolean;
}) {
  const rolPrincipal = usuario.roles[0]?.nombre ?? 'Sin rol';
  const estaBloqueado = usuario.estado === 'BLOQUEADO' || usuario.estado === 'INACTIVO';
  const esAdmin =
    usuario.roles.some((r) => r.codigo === 'ADMINISTRADOR') ||
    usuario.correoElectronico.toLowerCase() === 'admin@digemaps.gob.do';

  const configEstado = CONFIG_ESTADO_USUARIO[usuario.estado] ?? {
    label: usuario.estado,
    bg: 'rgba(71, 85, 105, 0.08)',
    border: 'rgba(71, 85, 105, 0.25)',
    color: '#334155',
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {usuario.nombreCompleto}
        </Typography>
        <Chip
          label={configEstado.label}
          size="small"
          variant="outlined"
          sx={{
            bgcolor: configEstado.bg,
            borderColor: configEstado.border,
            color: configEstado.color,
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {usuario.correoElectronico}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">Rol:</Typography>
        {esAdmin ? (
          <Chip
            icon={<LockOutlinedIcon sx={{ fontSize: '0.85rem !important' }} />}
            label="Administrador (Protegido)"
            size="small"
            variant="outlined"
            sx={{
              borderColor: '#2A6DB0',
              color: '#1D4E80',
              bgcolor: 'rgba(42, 109, 176, 0.06)',
              fontWeight: 600,
            }}
          />
        ) : (
          <Chip
            label={rolPrincipal}
            size="small"
            variant="outlined"
            sx={{ borderColor: 'rgba(15, 23, 42, 0.20)', color: 'text.secondary' }}
          />
        )}
        {usuario.empresa?.razonSocial && (
          <Typography variant="caption" color="text.secondary">
            · Empresa: {usuario.empresa.razonSocial}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button
          size="small"
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<EditOutlinedIcon fontSize="small" />}
          disabled={esAdmin}
          onClick={() => onEditarRol(usuario)}
        >
          Cambiar rol
        </Button>
        <Button
          size="small"
          variant="outlined"
          color={estaBloqueado ? 'primary' : 'error'}
          fullWidth
          startIcon={estaBloqueado ? <CheckCircleOutlineIcon fontSize="small" /> : <BlockOutlinedIcon fontSize="small" />}
          disabled={esAdmin || actualizandoEstado}
          onClick={() => onToggleEstado(usuario)}
        >
          {estaBloqueado ? 'Activar' : 'Desactivar'}
        </Button>
      </Box>
    </Paper>
  );
}

function TablaGestionUsuarios() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: usuarios, isLoading, isError, error } = useUsuariosTodos();
  const actualizarRol = useActualizarRolUsuario();
  const actualizarEstado = useActualizarEstadoUsuario();

  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [usuarioEditarRol, setUsuarioEditarRol] = useState<UsuarioSistema | null>(null);
  const [nuevoRol, setNuevoRol] = useState('');
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  if (isLoading) return <EstadoCarga etiqueta="Cargando directorio de usuarios…" />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar usuarios'}</Alert>;
  }

  const usuariosFiltrados = (usuarios ?? []).filter((u) => {
    const coincideRol =
      filtroRol === 'TODOS' || u.roles.some((r) => r.codigo === filtroRol);
    const coincideBusqueda =
      u.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correoElectronico.toLowerCase().includes(busqueda.toLowerCase());
    return coincideRol && coincideBusqueda;
  });

  async function handleGuardarRol() {
    if (!usuarioEditarRol || !nuevoRol) return;
    setErrorAccion(null);
    try {
      await actualizarRol.mutateAsync({ id: usuarioEditarRol.id, rolCodigo: nuevoRol });
      setUsuarioEditarRol(null);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'Error al cambiar rol');
    }
  }

  async function handleToggleEstado(usuario: UsuarioSistema) {
    const nuevoEstado = usuario.estado === 'BLOQUEADO' || usuario.estado === 'INACTIVO' ? 'APROBADO' : 'BLOQUEADO';
    setErrorAccion(null);
    try {
      await actualizarEstado.mutateAsync({ id: usuario.id, estado: nuevoEstado });
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Gestión de usuarios y roles
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Directorio institucional de cuentas registradas, asignación de roles y control de acceso.
        </Typography>
      </Box>

      {errorAccion && <Alert severity="error">{errorAccion}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          label="Buscar usuario"
          placeholder="Nombre o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          sx={{ minWidth: 260, flex: { xs: '1 1 100%', sm: 'none' } }}
        />
        <FormControl size="small" sx={{ minWidth: 220, flex: { xs: '1 1 100%', sm: 'none' } }}>
          <InputLabel>Filtrar por rol</InputLabel>
          <Select
            value={filtroRol}
            label="Filtrar por rol"
            onChange={(e) => setFiltroRol(e.target.value)}
          >
            <MenuItem value="TODOS">Todos los roles</MenuItem>
            {ROLES_DISPONIBLES.map((r) => (
              <MenuItem key={r.codigo} value={r.codigo}>
                {r.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {usuariosFiltrados.map((u) => (
            <TarjetaGestionUsuario
              key={u.id}
              usuario={u}
              onEditarRol={(usr) => {
                setUsuarioEditarRol(usr);
                setNuevoRol(usr.roles[0]?.codigo ?? 'TECNICO_EVALUADOR');
              }}
              onToggleEstado={handleToggleEstado}
              actualizandoEstado={actualizarEstado.isPending}
            />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre completo</TableCell>
                <TableCell>Correo electrónico</TableCell>
                <TableCell>Rol vigente</TableCell>
                <TableCell>Empresa</TableCell>
                <TableCell>Estado de cuenta</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuariosFiltrados.map((u) => {
                const rolPrincipal = u.roles[0]?.nombre ?? 'Sin rol';
                const estaBloqueado = u.estado === 'BLOQUEADO' || u.estado === 'INACTIVO';
                const esAdmin =
                  u.roles.some((r) => r.codigo === 'ADMINISTRADOR') ||
                  u.correoElectronico.toLowerCase() === 'admin@digemaps.gob.do';

                const configEstado = CONFIG_ESTADO_USUARIO[u.estado] ?? {
                  label: u.estado,
                  bg: 'rgba(71, 85, 105, 0.08)',
                  border: 'rgba(71, 85, 105, 0.25)',
                  color: '#334155',
                };

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <strong>{u.nombreCompleto}</strong>
                    </TableCell>
                    <TableCell>{u.correoElectronico}</TableCell>
                    <TableCell>
                      {esAdmin ? (
                        <Tooltip title="Cuenta del Administrador del Sistema protegida contra modificaciones de rol">
                          <Chip
                            icon={<LockOutlinedIcon sx={{ fontSize: '0.85rem !important' }} />}
                            label="Administrador (Protegido)"
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: '#2A6DB0',
                              color: '#1D4E80',
                              bgcolor: 'rgba(42, 109, 176, 0.06)',
                              fontWeight: 600,
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label={rolPrincipal}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: 'rgba(15, 23, 42, 0.20)', color: 'text.secondary' }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{u.empresa?.razonSocial ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={configEstado.label}
                        size="small"
                        variant="outlined"
                        sx={{
                          bgcolor: configEstado.bg,
                          borderColor: configEstado.border,
                          color: configEstado.color,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title={esAdmin ? 'No se puede modificar el rol del Administrador del Sistema' : ''}>
                          <span>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<EditOutlinedIcon fontSize="small" />}
                              disabled={esAdmin}
                              onClick={() => {
                                setUsuarioEditarRol(u);
                                setNuevoRol(u.roles[0]?.codigo ?? 'TECNICO_EVALUADOR');
                              }}
                            >
                              Cambiar rol
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title={esAdmin ? 'No se puede desactivar la cuenta del Administrador del Sistema' : ''}>
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              color={estaBloqueado ? 'primary' : 'error'}
                              startIcon={estaBloqueado ? <CheckCircleOutlineIcon fontSize="small" /> : <BlockOutlinedIcon fontSize="small" />}
                              disabled={esAdmin || actualizarEstado.isPending}
                              onClick={() => handleToggleEstado(u)}
                            >
                              {estaBloqueado ? 'Activar' : 'Desactivar'}
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Diálogo para Cambiar Rol */}
      <Dialog open={Boolean(usuarioEditarRol)} onClose={() => setUsuarioEditarRol(null)}>
        <DialogTitle>Asignar nuevo rol a usuario</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Selecciona el nuevo rol para <strong>{usuarioEditarRol?.nombreCompleto}</strong>:
          </Typography>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Rol</InputLabel>
            <Select
              value={nuevoRol}
              label="Rol"
              onChange={(e) => setNuevoRol(e.target.value)}
            >
              {ROLES_DISPONIBLES.map((r) => (
                <MenuItem key={r.codigo} value={r.codigo}>
                  {r.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUsuarioEditarRol(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGuardarRol}
            disabled={actualizarRol.isPending || !nuevoRol}
          >
            {actualizarRol.isPending ? <CircularProgress size={16} /> : 'Guardar rol'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---------------------------------------------------------------------
// TAB 2: Catálogos del Sistema: Tipos de Establecimiento
// ---------------------------------------------------------------------
function TarjetaCatalogoEstablecimiento({
  tipo,
  onEditar,
  onToggleActivo,
}: {
  tipo: TipoEstablecimientoAdmin;
  onEditar: (t: TipoEstablecimientoAdmin) => void;
  onToggleActivo: (t: TipoEstablecimientoAdmin) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {tipo.nombre}
        </Typography>
        <Chip
          label={tipo.activo ? 'Activo' : 'Inactivo'}
          size="small"
          variant="outlined"
          sx={{
            bgcolor: tipo.activo ? 'rgba(46, 125, 50, 0.08)' : 'rgba(100, 116, 139, 0.08)',
            borderColor: tipo.activo ? 'rgba(46, 125, 50, 0.3)' : 'rgba(100, 116, 139, 0.25)',
            color: tipo.activo ? '#1B5E20' : '#475569',
            fontWeight: 600,
          }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {tipo.descripcion ?? 'Sin descripción operativa'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          fullWidth
          startIcon={<EditOutlinedIcon fontSize="small" />}
          onClick={() => onEditar(tipo)}
        >
          Editar
        </Button>
        <Button
          size="small"
          variant="outlined"
          color={tipo.activo ? 'error' : 'primary'}
          fullWidth
          startIcon={tipo.activo ? <BlockOutlinedIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
          onClick={() => onToggleActivo(tipo)}
        >
          {tipo.activo ? 'Desactivar' : 'Activar'}
        </Button>
      </Box>
    </Paper>
  );
}

function TablaCatalogoEstablecimientos() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: tipos, isLoading, isError, error } = useTiposEstablecimientoAdmin();
  const crearTipo = useCrearTipoEstablecimiento();
  const actualizarTipo = useActualizarTipoEstablecimiento();

  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [tipoEditar, setTipoEditar] = useState<TipoEstablecimientoAdmin | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errorForm, setErrorForm] = useState<string | null>(null);

  if (isLoading) return <EstadoCarga etiqueta="Cargando catálogo de establecimientos…" />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar catálogo'}</Alert>;
  }

  async function handleCrear() {
    if (!nombre.trim()) {
      setErrorForm('El nombre es obligatorio.');
      return;
    }
    setErrorForm(null);
    try {
      await crearTipo.mutateAsync({ nombre: nombre.trim(), descripcion: descripcion.trim() });
      setNombre('');
      setDescripcion('');
      setModalNuevoOpen(false);
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al crear tipo');
    }
  }

  async function handleActualizar() {
    if (!tipoEditar || !nombre.trim()) return;
    setErrorForm(null);
    try {
      await actualizarTipo.mutateAsync({
        id: tipoEditar.id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
      });
      setTipoEditar(null);
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al actualizar tipo');
    }
  }

  async function handleToggleActivo(t: TipoEstablecimientoAdmin) {
    try {
      await actualizarTipo.mutateAsync({
        id: t.id,
        activo: !t.activo,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Gestión de tipos de establecimiento
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona las categorías oficiales de establecimientos alimentarios que los solicitantes seleccionan en la plataforma.
          </Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={<AddCircleOutlineIcon fontSize="small" />}
          onClick={() => {
            setNombre('');
            setDescripcion('');
            setErrorForm(null);
            setModalNuevoOpen(true);
          }}
        >
          Nuevo tipo
        </Button>
      </Box>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {(tipos ?? []).map((t) => (
            <TarjetaCatalogoEstablecimiento
              key={t.id}
              tipo={t}
              onEditar={(tipo) => {
                setTipoEditar(tipo);
                setNombre(tipo.nombre);
                setDescripcion(tipo.descripcion ?? '');
                setErrorForm(null);
              }}
              onToggleActivo={handleToggleActivo}
            />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre del tipo de establecimiento</TableCell>
                <TableCell>Descripción operativa</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(tipos ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell><strong>{t.nombre}</strong></TableCell>
                  <TableCell>{t.descripcion ?? 'Sin descripción'}</TableCell>
                  <TableCell>
                    <Chip
                      label={t.activo ? 'Activo' : 'Inactivo'}
                      size="small"
                      variant="outlined"
                      sx={{
                        bgcolor: t.activo ? 'rgba(46, 125, 50, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                        borderColor: t.activo ? 'rgba(46, 125, 50, 0.3)' : 'rgba(100, 116, 139, 0.25)',
                        color: t.activo ? '#1B5E20' : '#475569',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<EditOutlinedIcon fontSize="small" />}
                        onClick={() => {
                          setTipoEditar(t);
                          setNombre(t.nombre);
                          setDescripcion(t.descripcion ?? '');
                          setErrorForm(null);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color={t.activo ? 'error' : 'primary'}
                        startIcon={t.activo ? <BlockOutlinedIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
                        onClick={() => handleToggleActivo(t)}
                      >
                        {t.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Diálogo Nuevo / Editar Tipo */}
      <Dialog open={modalNuevoOpen || Boolean(tipoEditar)} onClose={() => { setModalNuevoOpen(false); setTipoEditar(null); }}>
        <DialogTitle>{tipoEditar ? 'Editar Tipo de Establecimiento' : 'Nuevo Tipo de Establecimiento'}</DialogTitle>
        <DialogContent dividers>
          {errorForm && <Alert severity="error" sx={{ mb: 2 }}>{errorForm}</Alert>}
          <TextField
            label="Nombre del tipo *"
            fullWidth
            required
            size="small"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Descripción operativa"
            fullWidth
            multiline
            rows={2}
            size="small"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setModalNuevoOpen(false); setTipoEditar(null); }}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={tipoEditar ? handleActualizar : handleCrear}
            disabled={crearTipo.isPending || actualizarTipo.isPending || !nombre.trim()}
          >
            {tipoEditar ? 'Guardar Cambios' : 'Crear Tipo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Componente Principal: DashboardAdmin
// ---------------------------------------------------------------------
export default function DashboardAdmin() {
  const { data: pendientes } = useRegistrosPendientes();
  const { data: usuarios } = useUsuariosTodos();
  const { data: tipos } = useTiposEstablecimientoAdmin();
  const { data: casos } = useCasos();

  const [tabActual, setTabActual] = useState(0);

  const totalPendientes = pendientes?.length ?? 0;
  const totalUsuarios = usuarios?.length ?? 0;
  const totalTipos = tipos?.filter((t) => t.activo).length ?? 0;
  const totalCasos = casos?.length ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        etiqueta="Administración"
        titulo="Panel de control administrativo"
        icono={<AdminPanelSettingsOutlinedIcon />}
      />


      <ResumenAdmin
        totalPendientes={totalPendientes}
        totalUsuarios={totalUsuarios}
        totalTipos={totalTipos}
        totalCasos={totalCasos}
      />

      <Paper variant="outlined">
        <Tabs
          value={tabActual}
          onChange={(_e, val) => setTabActual(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HowToRegOutlinedIcon fontSize="small" />
                Aprobación de usuarios
                {totalPendientes > 0 && (
                  <Chip
                    label={totalPendientes}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.75rem',
                      bgcolor: 'rgba(71, 85, 105, 0.12)',
                      color: 'text.primary',
                      fontWeight: 700,
                    }}
                  />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupOutlinedIcon fontSize="small" />
                Gestión de usuarios y roles
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryOutlinedIcon fontSize="small" />
                Gestión de tipos de establecimiento
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabActual === 0 && <TablaUsuariosPendientes />}
          {tabActual === 1 && <TablaGestionUsuarios />}
          {tabActual === 2 && <TablaCatalogoEstablecimientos />}
        </Box>
      </Paper>
    </Box>
  );
}
