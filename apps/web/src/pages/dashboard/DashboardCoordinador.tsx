import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  MenuItem,
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
import { useTecnicos } from '@/lib/coordinador/useTecnicos';
import { useCalendario } from '@/lib/coordinador/useCalendario';
import type { CasoResumen } from '@/lib/types';

function FormularioAsignar({ casoId }: { casoId: string }) {
  const { data: tecnicos, isLoading: cargandoTecnicos, isError: errorTecnicos } = useTecnicos();
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
      {errorTecnicos && (
        <Alert severity="error" sx={{ mb: 2 }}>
          No se pudo cargar la lista de técnicos.
        </Alert>
      )}
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
          select
          label="Técnico Evaluador"
          size="small"
          sx={{ minWidth: 260 }}
          value={evaluadorId}
          onChange={(e) => setEvaluadorId(e.target.value)}
          disabled={asignar.isPending || cargandoTecnicos}
        >
          {(tecnicos ?? []).map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.nombreCompleto}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          disabled={asignar.isPending || !evaluadorId}
          onClick={asignarEvaluador}
        >
          {asignar.isPending ? <CircularProgress size={20} /> : 'Asignar'}
        </Button>
      </Box>
      {!cargandoTecnicos && !errorTecnicos && (tecnicos?.length ?? 0) === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          No hay ningún Técnico Evaluador aprobado en el sistema todavía.
        </Typography>
      )}
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

function Calendario() {
  const { data: tecnicos, isLoading: cargandoTecnicos } = useTecnicos();
  const [evaluadorId, setEvaluadorId] = useState('');
  const { data: eventos, isLoading, isError, error } = useCalendario(evaluadorId || undefined);

  return (
    <Box>
      <TextField
        select
        label="Técnico Evaluador"
        size="small"
        sx={{ minWidth: 260, mb: 2 }}
        value={evaluadorId}
        onChange={(e) => setEvaluadorId(e.target.value)}
        disabled={cargandoTecnicos}
      >
        {(tecnicos ?? []).map((t) => (
          <MenuItem key={t.id} value={t.id}>
            {t.nombreCompleto}
          </MenuItem>
        ))}
      </TextField>

      {!evaluadorId && (
        <Typography color="text.secondary">Elegí un técnico para ver su calendario.</Typography>
      )}

      {evaluadorId && isLoading && <CircularProgress size={24} />}
      {evaluadorId && isError && (
        <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar el calendario'}</Alert>
      )}
      {evaluadorId && eventos && eventos.length === 0 && (
        <Typography color="text.secondary">Este técnico no tiene evaluaciones programadas.</Typography>
      )}
      {evaluadorId && eventos && eventos.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Establecimiento</TableCell>
                <TableCell>Fecha programada</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventos.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell>{ev.establecimiento.nombre}</TableCell>
                  <TableCell>{ev.fechaProgramada ? new Date(ev.fechaProgramada).toLocaleDateString() : 'Sin fecha'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default function DashboardCoordinador() {
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
        <Calendario />
      </Box>
    </Box>
  );
}
