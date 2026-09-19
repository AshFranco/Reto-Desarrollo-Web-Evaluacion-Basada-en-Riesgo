import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { useSesion } from '@/lib/auth/useSesion';
import { silentRefresh } from '@/lib/auth/refresh';
import {
  useEmpresa,
  useEditarEmpresa,
  useCrearEmpresa,
  type DatosEmpresa,
} from '@/lib/empresa/useEmpresas';
import { useSolicitudesPropias } from '@/lib/empresa/useSolicitudes';
import { useEstablecimientos } from '@/lib/empresa/useEstablecimientos';
import {
  useDelegados,
  useInvitarDelegado,
  useCambiarEstadoDelegado,
} from '@/lib/empresa/useDelegados';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoChip } from '@/components/ui/EstadoChip';

const EMPRESA_VACIA: DatosEmpresa = { razonSocial: '', rnc: '', nombreComercial: '', direccion: '', telefono: '', correo: '', actividadEconomica: '' };

const RNC_REGEX = /^[0-9]{9}$|^[0-9]{11}$/;
const TELEFONO_REGEX = /^[0-9]{10}$/;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ErroresEmpresa {
  rnc?: string;
  telefono?: string;
  correo?: string;
}

function validarEmpresa(datos: { rnc: string; telefono?: string; correo?: string }): ErroresEmpresa {
  const errores: ErroresEmpresa = {};
  if (datos.rnc) {
    if (datos.rnc.includes('-')) {
      errores.rnc = 'El RNC no puede contener guiones ni signos negativos.';
    } else if (!RNC_REGEX.test(datos.rnc)) {
      errores.rnc = 'El RNC debe contener exactamente 9 u 11 dígitos numéricos.';
    }
  }

  if (datos.telefono) {
    if (datos.telefono.includes('-')) {
      errores.telefono = 'El teléfono no puede contener signos negativos ni guiones.';
    } else if (!TELEFONO_REGEX.test(datos.telefono)) {
      errores.telefono = 'El teléfono debe contener exactamente 10 dígitos numéricos.';
    }
  }

  if (datos.correo && !CORREO_REGEX.test(datos.correo)) {
    errores.correo = 'El formato del correo electrónico no es válido.';
  }

  return errores;
}

function FormularioCrearEmpresa() {
  const crearEmpresa = useCrearEmpresa();
  const [datos, setDatos] = useState<DatosEmpresa>(EMPRESA_VACIA);
  const [errores, setErrores] = useState<ErroresEmpresa>({});
  const [error, setError] = useState<string | null>(null);

  function actualizarCampo<K extends keyof DatosEmpresa>(campo: K, valor: string) {
    const nuevos = { ...datos, [campo]: valor };
    setDatos(nuevos);
    setErrores(validarEmpresa(nuevos));
  }

  async function guardar() {
    const errs = validarEmpresa(datos);
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    setError(null);
    try {
      await crearEmpresa.mutateAsync(datos);
      await silentRefresh();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la empresa');
    }
  }

  const tieneErrores = Object.keys(errores).length > 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Todavía no tienes una empresa registrada. Completa los datos para crearla — queda
          vinculada a tu usuario automáticamente.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Razón social"
          fullWidth
          required
          margin="dense"
          value={datos.razonSocial}
          onChange={(e) => actualizarCampo('razonSocial', e.target.value)}
          disabled={crearEmpresa.isPending}
        />
        <TextField
          label="RNC"
          fullWidth
          required
          margin="dense"
          value={datos.rnc}
          onChange={(e) => actualizarCampo('rnc', e.target.value)}
          disabled={crearEmpresa.isPending}
          error={Boolean(errores.rnc)}
          helperText={errores.rnc ?? '9 u 11 dígitos numéricos sin signos'}
        />
        <TextField
          label="Nombre comercial"
          fullWidth
          margin="dense"
          value={datos.nombreComercial}
          onChange={(e) => actualizarCampo('nombreComercial', e.target.value)}
          disabled={crearEmpresa.isPending}
        />
        <TextField
          label="Dirección"
          fullWidth
          margin="dense"
          value={datos.direccion}
          onChange={(e) => actualizarCampo('direccion', e.target.value)}
          disabled={crearEmpresa.isPending}
        />
        <TextField
          label="Teléfono"
          fullWidth
          margin="dense"
          value={datos.telefono}
          onChange={(e) => actualizarCampo('telefono', e.target.value)}
          disabled={crearEmpresa.isPending}
          error={Boolean(errores.telefono)}
          helperText={errores.telefono ?? '10 dígitos sin guiones ni signos'}
          inputProps={{ maxLength: 10 }}
        />
        <TextField
          label="Correo"
          fullWidth
          margin="dense"
          value={datos.correo}
          onChange={(e) => actualizarCampo('correo', e.target.value)}
          disabled={crearEmpresa.isPending}
          error={Boolean(errores.correo)}
          helperText={errores.correo}
        />
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          disabled={crearEmpresa.isPending || !datos.razonSocial.trim() || !datos.rnc.trim() || tieneErrores}
          onClick={guardar}
        >
          {crearEmpresa.isPending ? <CircularProgress size={20} /> : 'Crear empresa'}
        </Button>
      </CardContent>
    </Card>
  );
}


function SeccionEmpresa({ empresaId, puedeEditar }: { empresaId: string; puedeEditar: boolean }) {
  const { data: empresa, isLoading, isError, error } = useEmpresa(empresaId);
  const editarEmpresa = useEditarEmpresa(empresaId);
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState<DatosEmpresa | null>(null);
  const [errores, setErrores] = useState<ErroresEmpresa>({});
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  if (isLoading) return <EstadoCarga />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar la empresa'}</Alert>;
  }
  if (!empresa) return null;

  function empezarEdicion() {
    setErrorGuardado(null);
    setErrores({});
    setDatos({
      razonSocial: empresa!.razonSocial,
      rnc: empresa!.rnc,
      nombreComercial: empresa!.nombreComercial ?? '',
      direccion: empresa!.direccion ?? '',
      telefono: empresa!.telefono ?? '',
      correo: empresa!.correo ?? '',
      actividadEconomica: empresa!.actividadEconomica ?? '',
    });
    setEditando(true);
  }

  function actualizarCampo<K extends keyof DatosEmpresa>(campo: K, valor: string) {
    if (!datos) return;
    const nuevos = { ...datos, [campo]: valor };
    setDatos(nuevos);
    setErrores(validarEmpresa(nuevos));
  }

  async function guardar() {
    if (!datos) return;
    const errs = validarEmpresa(datos);
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    setErrorGuardado(null);
    try {
      await editarEmpresa.mutateAsync(datos);
      setEditando(false);
    } catch (err) {
      setErrorGuardado(err instanceof Error ? err.message : 'Error al guardar los cambios');
    }
  }

  const tieneErrores = Object.keys(errores).length > 0;

  if (editando && datos) {
    return (
      <Card>
        <CardContent>
          {errorGuardado && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorGuardado}
            </Alert>
          )}
          <TextField
            label="Razón social"
            fullWidth
            required
            margin="dense"
            value={datos.razonSocial}
            onChange={(e) => actualizarCampo('razonSocial', e.target.value)}
          />
          <TextField
            label="RNC"
            fullWidth
            required
            margin="dense"
            value={datos.rnc}
            onChange={(e) => actualizarCampo('rnc', e.target.value)}
            error={Boolean(errores.rnc)}
            helperText={errores.rnc ?? '9 u 11 dígitos numéricos sin signos'}
          />
          <TextField
            label="Nombre comercial"
            fullWidth
            margin="dense"
            value={datos.nombreComercial}
            onChange={(e) => actualizarCampo('nombreComercial', e.target.value)}
          />
          <TextField
            label="Dirección"
            fullWidth
            margin="dense"
            value={datos.direccion}
            onChange={(e) => actualizarCampo('direccion', e.target.value)}
          />
          <TextField
            label="Teléfono"
            fullWidth
            margin="dense"
            value={datos.telefono}
            onChange={(e) => actualizarCampo('telefono', e.target.value)}
            error={Boolean(errores.telefono)}
            helperText={errores.telefono ?? '10 dígitos sin guiones ni signos'}
            inputProps={{ maxLength: 10 }}
          />
          <TextField
            label="Correo"
            fullWidth
            margin="dense"
            value={datos.correo}
            onChange={(e) => actualizarCampo('correo', e.target.value)}
            error={Boolean(errores.correo)}
            helperText={errores.correo}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="contained"
              onClick={guardar}
              disabled={editarEmpresa.isPending || !datos.razonSocial.trim() || !datos.rnc.trim() || tieneErrores}
            >
              {editarEmpresa.isPending ? <CircularProgress size={20} /> : 'Guardar'}
            </Button>
            <Button onClick={() => setEditando(false)} disabled={editarEmpresa.isPending}>
              Cancelar
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h6">{empresa.razonSocial}</Typography>
            <Typography color="text.secondary">RNC: {empresa.rnc}</Typography>
            {empresa.nombreComercial && <Typography color="text.secondary">Nombre comercial: {empresa.nombreComercial}</Typography>}
            {empresa.direccion && <Typography color="text.secondary">Dirección: {empresa.direccion}</Typography>}
            {empresa.telefono && <Typography color="text.secondary">Teléfono: {empresa.telefono}</Typography>}
            {empresa.correo && <Typography color="text.secondary">Correo: {empresa.correo}</Typography>}
          </Box>
          {puedeEditar && (
            <Button variant="outlined" size="small" onClick={empezarEdicion} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>
              Editar
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function ListaSolicitudes() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: solicitudes, isLoading, isError, error } = useSolicitudesPropias();

  if (isLoading) return <EstadoCarga />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar las solicitudes'}</Alert>;
  }
  if (!solicitudes || solicitudes.length === 0) {
    return <EstadoVacio titulo="Todavía no hay solicitudes BPM registradas." icono={<DescriptionOutlinedIcon fontSize="large" />} />;
  }

  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {solicitudes.map((s) => (
          <Paper key={s.id} variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {s.tipoEstablecimiento}
              </Typography>
              <EstadoChip estado={s.estado} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Motivo: {s.motivo}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Fecha: {new Date(s.fechaCreacion).toLocaleDateString()}
            </Typography>
          </Paper>
        ))}
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Tipo de establecimiento</TableCell>
            <TableCell>Motivo</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Fecha</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {solicitudes.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.tipoEstablecimiento}</TableCell>
              <TableCell>{s.motivo}</TableCell>
              <TableCell>
                <EstadoChip estado={s.estado} />
              </TableCell>
              <TableCell>{new Date(s.fechaCreacion).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ListaEstablecimientos() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: establecimientos, isLoading, isError, error } = useEstablecimientos();

  if (isLoading) return <EstadoCarga />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar los establecimientos'}</Alert>;
  }
  if (!establecimientos || establecimientos.length === 0) {
    return <EstadoVacio titulo="Todavía no registraste ningún establecimiento." icono={<DomainOutlinedIcon fontSize="large" />} />;
  }

  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {establecimientos.map((est) => (
          <Paper key={est.id} variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {est.nombre}
              </Typography>
              <Button size="small" variant="outlined" component={RouterLink} to={`/empresa/establecimientos/${est.id}/editar`}>
                Editar
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Dirección: {est.calle ?? '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Permiso sanitario: {est.numeroPermisoSanitario ?? '—'}
            </Typography>
          </Paper>
        ))}
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Dirección</TableCell>
            <TableCell>Permiso sanitario</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {establecimientos.map((est) => (
            <TableRow key={est.id}>
              <TableCell>{est.nombre}</TableCell>
              <TableCell>{est.calle ?? '—'}</TableCell>
              <TableCell>{est.numeroPermisoSanitario ?? '—'}</TableCell>
              <TableCell align="right">
                <Button size="small" component={RouterLink} to={`/empresa/establecimientos/${est.id}/editar`}>
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function DialogInvitarDelegado({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invitar = useInvitarDelegado();
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [correoElectronico, setCorreoElectronico] = useState('');
  const [cedulaPasaporte, setCedulaPasaporte] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [contrasenaGenerada, setContrasenaGenerada] = useState<string | null>(null);

  async function handleInvitar() {
    setError(null);
    try {
      const resultado = await invitar.mutateAsync({ nombreCompleto, correoElectronico, cedulaPasaporte });
      setContrasenaGenerada(resultado.contrasenaTemporal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al invitar al delegado');
    }
  }

  function handleClose() {
    setNombreCompleto('');
    setCorreoElectronico('');
    setCedulaPasaporte('');
    setError(null);
    setContrasenaGenerada(null);
    onClose();
  }

  if (contrasenaGenerada) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Delegado invitado</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta contraseña temporal solo se muestra una vez. Compártela con el delegado por un canal seguro (no queda guardada en ningún otro lugar).
          </Alert>
          <DialogContentText sx={{ mb: 1 }}>Contraseña temporal:</DialogContentText>
          <Typography variant="h6" fontFamily="monospace" sx={{ userSelect: 'all', wordBreak: 'break-all' }}>
            {contrasenaGenerada}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">Listo</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Invitar nuevo delegado</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Ingresa los datos del nuevo usuario delegado. Se generará una contraseña temporal aleatoria que se mostrará una sola vez al confirmar.
        </DialogContentText>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          margin="dense"
          label="Nombre completo"
          fullWidth
          required
          value={nombreCompleto}
          onChange={(e) => setNombreCompleto(e.target.value)}
          disabled={invitar.isPending}
        />
        <TextField
          margin="dense"
          label="Correo electrónico"
          type="email"
          fullWidth
          required
          value={correoElectronico}
          onChange={(e) => setCorreoElectronico(e.target.value)}
          disabled={invitar.isPending}
        />
        <TextField
          margin="dense"
          label="Cédula o pasaporte"
          fullWidth
          required
          value={cedulaPasaporte}
          onChange={(e) => setCedulaPasaporte(e.target.value)}
          disabled={invitar.isPending}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={invitar.isPending}>Cancelar</Button>
        <Button
          onClick={handleInvitar}
          variant="contained"
          disabled={invitar.isPending || !nombreCompleto || !correoElectronico || !cedulaPasaporte}
        >
          {invitar.isPending ? <CircularProgress size={20} /> : 'Invitar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ListaDelegados() {
  const { data: delegados, isLoading, isError, error } = useDelegados();
  const cambiarEstado = useCambiarEstadoDelegado();

  if (isLoading) return <EstadoCarga />;
  if (isError) return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar los delegados'}</Alert>;
  
  if (!delegados || delegados.length === 0) {
    return <EstadoVacio titulo="Aún no has invitado a ningún delegado." icono={<GroupOutlinedIcon fontSize="large" />} />;
  }

  async function handleToggleEstado(id: string, estadoActual: string) {
    const nuevoEstado = estadoActual === 'APROBADO' ? 'INACTIVO' : 'APROBADO';
    try {
      await cambiarEstado.mutateAsync({ id, estado: nuevoEstado });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Correo</TableCell>
            <TableCell>Fecha de ingreso</TableCell>
            <TableCell align="center">Activo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {delegados.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.nombreCompleto}</TableCell>
              <TableCell>{d.correoElectronico}</TableCell>
              <TableCell>{new Date(d.fechaCreacion).toLocaleDateString()}</TableCell>
              <TableCell align="center">
                <Switch
                  checked={d.estado === 'APROBADO'}
                  onChange={() => handleToggleEstado(d.id, d.estado)}
                  disabled={cambiarEstado.isPending && cambiarEstado.variables?.id === d.id}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ResumenEmpresa() {
  const { data: establecimientos } = useEstablecimientos();
  const { data: solicitudes } = useSolicitudesPropias();

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <StatCard icono={<DomainOutlinedIcon />} valor={establecimientos?.length ?? 0} etiqueta="Establecimientos" />
      <StatCard icono={<DescriptionOutlinedIcon />} valor={solicitudes?.length ?? 0} etiqueta="Solicitudes BPM" />
    </Box>
  );
}

export default function DashboardEmpresa() {
  const { sesion, cargando } = useSesion();
  const [openInvitar, setOpenInvitar] = useState(false);

  if (cargando) return <EstadoCarga etiqueta="Cargando tu panel…" />;

  const empresaId = sesion?.usuario.empresaId ?? null;
  const puedeEditar = sesion?.usuario.rol === 'ADMINISTRADOR_EMPRESA';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        etiqueta="Empresa"
        titulo="Panel de empresa"
        icono={<DomainOutlinedIcon />}
        accion={
          <Button variant="outlined" component={RouterLink} to="/historico">
            Consulta histórica
          </Button>
        }
      />

      {empresaId && <ResumenEmpresa />}

      <Box>
        <Typography variant="h6" gutterBottom>
          Mi empresa
        </Typography>
        {empresaId ? <SeccionEmpresa empresaId={empresaId} puedeEditar={puedeEditar} /> : <FormularioCrearEmpresa />}
      </Box>

      {empresaId && puedeEditar && (
        <Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1, mb: 1 }}>
            <Typography variant="h6">Mis establecimientos</Typography>
            <Button variant="contained" component={RouterLink} to="/empresa/establecimientos/nuevo">
              Nuevo establecimiento
            </Button>
          </Box>
          <ListaEstablecimientos />
        </Box>
      )}

      {empresaId && puedeEditar && (
        <Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1, mb: 1 }}>
            <Typography variant="h6">Gestión de delegados</Typography>
            <Button variant="outlined" onClick={() => setOpenInvitar(true)}>
              Invitar delegado
            </Button>
          </Box>
          <ListaDelegados />
          <DialogInvitarDelegado open={openInvitar} onClose={() => setOpenInvitar(false)} />
        </Box>
      )}

      <Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1, mb: 1 }}>
          <Typography variant="h6">Mis solicitudes BPM</Typography>
          <Button variant="contained" component={RouterLink} to="/empresa/solicitudes/nueva">
            Nueva solicitud BPM
          </Button>
        </Box>
        <ListaSolicitudes />
      </Box>
    </Box>
  );
}
