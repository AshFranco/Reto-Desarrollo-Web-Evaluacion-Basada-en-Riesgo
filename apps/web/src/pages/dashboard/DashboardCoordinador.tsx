import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useCasos, useCasoDetalle, useAsignarEvaluador } from '@/lib/coordinador/useCasos';
import type { AsignacionEvaluador, CasoResumen } from '@/lib/types';

function FormularioAsignar({ casoId }: { casoId: string }) {
  const asignar = useAsignarEvaluador();
  const [evaluadorId, setEvaluadorId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function asignarEvaluador() {
    setError(null);
    setExito(false);
    try {
      await asignar.mutateAsync({ casoId, evaluadorId });
      setExito(true);
      setEvaluadorId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar el evaluador');
    }
  }

  return (
    <Box sx={{ mt: 2, padding: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Asignar Técnico Evaluador
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        No existe todavía un endpoint para listar los Técnicos Evaluadores disponibles
        (revisado en <code>usuarios.controller.ts</code>) — hay que conocer el ID numérico del
        técnico por otra vía (por ejemplo, consultándolo directamente en la base de datos)
        hasta que se agregue esa función al backend.
      </Alert>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {exito && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Técnico asignado correctamente.
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="ID del Técnico Evaluador"
          size="small"
          value={evaluadorId}
          onChange={(e) => setEvaluadorId(e.target.value)}
          disabled={asignar.isPending}
        />
        <Button
          variant="contained"
          disabled={asignar.isPending || !evaluadorId}
          onClick={asignarEvaluador}
        >
          {asignar.isPending ? <CircularProgress size={20} /> : 'Asignar'}
        </Button>
      </Box>
    </Box>
  );
}

function DetalleCaso({ casoId }: { casoId: string }) {
  const { data: detalle, isLoading, isError, error } = useCasoDetalle(casoId);

  if (isLoading) return <CircularProgress size={24} />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar el detalle'}</Alert>;
  }
  if (!detalle) return null;

  const sinAsignar = !detalle.estado || detalle.estado === 'Pendiente';

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="body2">
        <strong>Empresa:</strong> {detalle.establecimiento.empresa.razonSocial} (RNC: {detalle.establecimiento.empresa.rnc})
      </Typography>
      <Typography variant="body2">
        <strong>Establecimiento:</strong> {detalle.establecimiento.nombre}
      </Typography>
      {detalle.solicitud && (
        <Typography variant="body2">
          <strong>Solicitud:</strong> {detalle.solicitud.motivo} ({detalle.solicitud.tipoEstablecimiento})
        </Typography>
      )}
      {detalle.alerta && (
        <Typography variant="body2">
          <strong>Alerta LAPCH:</strong> {detalle.alerta.numeroAlerta} — {detalle.alerta.descripcion}
        </Typography>
      )}
      {detalle.denuncia && (
        <Typography variant="body2">
          <strong>Denuncia:</strong> {detalle.denuncia.tipoDenuncia} — {detalle.denuncia.descripcion}
        </Typography>
      )}
      {detalle.programacion && (
        <Typography variant="body2">
          <strong>Programación institucional:</strong> {new Date(detalle.programacion.fechaProgramada).toLocaleDateString()} ({detalle.programacion.frecuenciaAplicada})
        </Typography>
      )}
      <Typography variant="body2">
        <strong>Evaluaciones registradas:</strong> {detalle.evaluaciones.length}
      </Typography>

      {sinAsignar ? (
        <FormularioAsignar casoId={casoId} />
      ) : (
        <Alert severity="success" sx={{ mt: 2 }}>
          Este caso ya tiene un evaluador asignado.
        </Alert>
      )}
    </Box>
  );
}

function FilaCaso({ caso }: { caso: CasoResumen }) {
  const [abierto, setAbierto] = useState(false);
  const evaluadorAsignado = caso.asignaciones[0]?.evaluador?.nombreCompleto ?? null;

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setAbierto(!abierto)}>
            {abierto ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{caso.origen?.nombre ?? '—'}</TableCell>
        <TableCell>{caso.establecimiento.nombre}</TableCell>
        <TableCell>
          <Chip size="small" label={caso.estado} color={evaluadorAsignado ? 'success' : 'default'} />
        </TableCell>
        <TableCell>{caso.prioridad ?? 'NORMAL'}</TableCell>
        <TableCell>{evaluadorAsignado ?? 'Sin asignar'}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ paddingTop: 0, paddingBottom: 0 }}>
          <Collapse in={abierto} unmountOnExit>
            <DetalleCaso casoId={caso.id} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function TablaCasos() {
  const { data: casos, isLoading, isError, error } = useCasos();

  if (isLoading) return <CircularProgress size={24} />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar los casos'}</Alert>;
  }
  if (!casos || casos.length === 0) {
    return <Typography color="text.secondary">No hay casos registrados.</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Origen</TableCell>
            <TableCell>Establecimiento</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Prioridad</TableCell>
            <TableCell>Evaluador</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {casos.map((caso) => (
            <FilaCaso key={caso.id} caso={caso} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ProximasEvaluaciones({ casos }: { casos: CasoResumen[] }) {
  const asignados: { caso: CasoResumen; asignacion: AsignacionEvaluador }[] = [];
  for (const caso of casos) {
    const asignacion = caso.asignaciones[0];
    if (asignacion) asignados.push({ caso, asignacion });
  }
  asignados.sort(
    (a, b) => new Date(a.asignacion.fechaAsignacion).getTime() - new Date(b.asignacion.fechaAsignacion).getTime()
  );

  if (asignados.length === 0) {
    return <Typography color="text.secondary">No hay casos con evaluador asignado todavía.</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Establecimiento</TableCell>
            <TableCell>Evaluador</TableCell>
            <TableCell>Fecha de asignación</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {asignados.map(({ caso, asignacion }) => (
            <TableRow key={caso.id}>
              <TableCell>{caso.establecimiento.nombre}</TableCell>
              <TableCell>{asignacion.evaluador?.nombreCompleto ?? '—'}</TableCell>
              <TableCell>{new Date(asignacion.fechaAsignacion).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function DashboardCoordinador() {
  const { data: casos } = useCasos();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4">Panel de Coordinador</Typography>

      <Box>
        <Typography variant="h6" gutterBottom>
          Casos
        </Typography>
        <TablaCasos />
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          Calendario de evaluaciones
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          El endpoint <code>GET /api/v1/calendario</code> está restringido a Técnico Evaluador
          y solo devuelve las evaluaciones de quien lo consulta — no existe hoy una forma de
          ver el calendario de todo el equipo desde este rol. Mientras tanto, esta lista
          muestra los casos con evaluador asignado, ordenados por fecha de asignación, como
          aproximación.
        </Alert>
        {casos ? <ProximasEvaluaciones casos={casos} /> : <CircularProgress size={24} />}
      </Box>
    </Box>
  );
}
