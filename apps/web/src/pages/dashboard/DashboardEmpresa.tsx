import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useSesion } from '@/lib/auth/useSesion';
import { useEmpresa, useEditarEmpresa, type DatosEmpresa } from '@/lib/empresa/useEmpresas';
import { useSolicitudesPropias } from '@/lib/empresa/useSolicitudes';

function SeccionEmpresa({ empresaId, puedeEditar }: { empresaId: string; puedeEditar: boolean }) {
  const { data: empresa, isLoading, isError, error } = useEmpresa(empresaId);
  const editarEmpresa = useEditarEmpresa(empresaId);
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState<DatosEmpresa | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  if (isLoading) return <CircularProgress size={24} />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar la empresa'}</Alert>;
  }
  if (!empresa) return null;

  function empezarEdicion() {
    setErrorGuardado(null);
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

  async function guardar() {
    if (!datos) return;
    setErrorGuardado(null);
    try {
      await editarEmpresa.mutateAsync(datos);
      setEditando(false);
    } catch (err) {
      setErrorGuardado(err instanceof Error ? err.message : 'Error al guardar los cambios');
    }
  }

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
            onChange={(e) => setDatos({ ...datos, razonSocial: e.target.value })}
          />
          <TextField
            label="RNC"
            fullWidth
            required
            margin="dense"
            value={datos.rnc}
            onChange={(e) => setDatos({ ...datos, rnc: e.target.value })}
          />
          <TextField
            label="Nombre comercial"
            fullWidth
            margin="dense"
            value={datos.nombreComercial}
            onChange={(e) => setDatos({ ...datos, nombreComercial: e.target.value })}
          />
          <TextField
            label="Dirección"
            fullWidth
            margin="dense"
            value={datos.direccion}
            onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
          />
          <TextField
            label="Teléfono"
            fullWidth
            margin="dense"
            value={datos.telefono}
            onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
          />
          <TextField
            label="Correo"
            fullWidth
            margin="dense"
            value={datos.correo}
            onChange={(e) => setDatos({ ...datos, correo: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button variant="contained" onClick={guardar} disabled={editarEmpresa.isPending}>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6">{empresa.razonSocial}</Typography>
            <Typography color="text.secondary">RNC: {empresa.rnc}</Typography>
            {empresa.nombreComercial && <Typography color="text.secondary">Nombre comercial: {empresa.nombreComercial}</Typography>}
            {empresa.direccion && <Typography color="text.secondary">Dirección: {empresa.direccion}</Typography>}
            {empresa.telefono && <Typography color="text.secondary">Teléfono: {empresa.telefono}</Typography>}
            {empresa.correo && <Typography color="text.secondary">Correo: {empresa.correo}</Typography>}
          </Box>
          {puedeEditar && (
            <Button variant="outlined" size="small" onClick={empezarEdicion}>
              Editar
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function ListaSolicitudes() {
  const { data: solicitudes, isLoading, isError, error } = useSolicitudesPropias();

  if (isLoading) return <CircularProgress size={24} />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar las solicitudes'}</Alert>;
  }
  if (!solicitudes || solicitudes.length === 0) {
    return <Typography color="text.secondary">Todavía no hay solicitudes BPM registradas.</Typography>;
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
                <Chip
                  size="small"
                  label={s.estado}
                  color={s.estado === 'Asignada' ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell>{new Date(s.fechaCreacion).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function DashboardEmpresa() {
  const { sesion, cargando } = useSesion();

  if (cargando) return <CircularProgress />;

  const empresaId = sesion?.usuario.empresaId ?? null;
  const puedeEditar = sesion?.usuario.rol === 'ADMINISTRADOR_EMPRESA';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4">Panel de Empresa</Typography>

      <Alert severity="info">
        Gestión de establecimientos: pendiente, no implementado en el backend todavía. Por eso
        una solicitud BPM se puede guardar como borrador, pero enviarla requiere un
        establecimiento registrado — hoy eso solo es posible si tu empresa ya tiene alguno
        cargado.
      </Alert>

      <Box>
        <Typography variant="h6" gutterBottom>
          Mi empresa
        </Typography>
        {empresaId ? (
          <SeccionEmpresa empresaId={empresaId} puedeEditar={puedeEditar} />
        ) : (
          <Alert severity="warning">
            Tu usuario todavía no tiene una empresa asociada. Registrar una empresa nueva lo
            hace un Administrador (el backend no permite que un Administrador Empresa o
            Usuario Delegado cree su propia empresa) — contacta a un Administrador para que la
            registre y la asocie a tu cuenta.
          </Alert>
        )}
      </Box>

      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
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
