import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { useEvaluacionesAsignadas } from '@/lib/tecnico/useEvaluacionesAsignadas';
import { useSyncStatus } from '@/lib/sync/useSyncStatus';
import type { AsignacionMia } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoChip } from '@/components/ui/EstadoChip';

/**
 * La acción del botón varía según la situación real de la asignación y la evaluación:
 * - Caso Cerrado: "Ver expediente" o "Consultar" (modo lectura).
 * - DEVUELTA: "Corregir evaluación" (prioridad de atención).
 * - EN_CURSO: "Continuar evaluación".
 * - PROGRAMADA: "Iniciar evaluación".
 * - EN_REVISION / APROBADA: "Ver evaluación" (modo consulta).
 */
function FilaAsignacion({ asignacion }: { asignacion: AsignacionMia }) {
  const navigate = useNavigate();
  const sync = useSyncStatus();
  const casoCerrado = asignacion.caso.estado === 'Cerrado' || asignacion.caso.estado === 'CERRADO';
  const estadoEvaluacion = asignacion.evaluacionEstado;
  const esInspeccionSoloLectura = casoCerrado || estadoEvaluacion === 'CERRADA' || estadoEvaluacion === 'APROBADA';
  const bloqueadoSinConexion = !sync.enLinea && esInspeccionSoloLectura;

  let botonTexto = 'Iniciar evaluación';
  let botonVariant: 'contained' | 'outlined' = 'contained';
  let botonIcono = <PlayArrowOutlinedIcon fontSize="small" />;

  if (casoCerrado) {
    botonTexto = 'Ver expediente';
    botonVariant = 'outlined';
    botonIcono = <VisibilityOutlinedIcon fontSize="small" />;
  } else if (estadoEvaluacion === 'DEVUELTA') {
    botonTexto = 'Ver observaciones y corregir';
    botonVariant = 'contained';
    botonIcono = <EditOutlinedIcon fontSize="small" />;
  } else if (estadoEvaluacion === 'EN_CURSO') {
    botonTexto = 'Continuar evaluación';
    botonVariant = 'contained';
    botonIcono = <PlayArrowOutlinedIcon fontSize="small" />;
  } else if (
    estadoEvaluacion === 'EN_REVISION' ||
    estadoEvaluacion === 'APROBADA' ||
    estadoEvaluacion === 'FINALIZADA' ||
    estadoEvaluacion === 'CERRADA'
  ) {
    botonTexto = 'Ver evaluación';
    botonVariant = 'outlined';
    botonIcono = <VisibilityOutlinedIcon fontSize="small" />;
  }

  const botonElemento = (
    <Button
      size="small"
      variant={botonVariant}
      color={estadoEvaluacion === 'DEVUELTA' ? 'error' : 'primary'}
      startIcon={botonIcono}
      disabled={!asignacion.evaluacionId || bloqueadoSinConexion}
      onClick={() => navigate(`/tecnico/evaluaciones/${asignacion.evaluacionId}`)}
    >
      {botonTexto}
    </Button>
  );

  return (
    <TableRow>
      <TableCell>{asignacion.caso.establecimiento.nombre}</TableCell>
      <TableCell>{new Date(asignacion.fechaAsignacion).toLocaleDateString()}</TableCell>
      <TableCell>
        <EstadoChip estado={asignacion.caso.estado} />
      </TableCell>
      <TableCell>
        {estadoEvaluacion === 'DEVUELTA' ? <EstadoChip estado="Devuelta" /> : '—'}
      </TableCell>
      <TableCell>
        {bloqueadoSinConexion ? (
          <Tooltip title="Conéctate a internet para realizar esta acción">
            <span>{botonElemento}</span>
          </Tooltip>
        ) : (
          botonElemento
        )}
        {!asignacion.evaluacionId && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Esta asignación todavía no tiene una evaluación asociada.
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
}

function TarjetaAsignacionTecnico({ asignacion }: { asignacion: AsignacionMia }) {
  const navigate = useNavigate();
  const sync = useSyncStatus();
  const casoCerrado = asignacion.caso.estado === 'Cerrado' || asignacion.caso.estado === 'CERRADO';
  const estadoEvaluacion = asignacion.evaluacionEstado;
  const esInspeccionSoloLectura = casoCerrado || estadoEvaluacion === 'CERRADA' || estadoEvaluacion === 'APROBADA';
  const bloqueadoSinConexion = !sync.enLinea && esInspeccionSoloLectura;

  let botonTexto = 'Iniciar evaluación';
  let botonVariant: 'contained' | 'outlined' = 'contained';
  let botonIcono = <PlayArrowOutlinedIcon fontSize="small" />;

  if (casoCerrado) {
    botonTexto = 'Ver expediente';
    botonVariant = 'outlined';
    botonIcono = <VisibilityOutlinedIcon fontSize="small" />;
  } else if (estadoEvaluacion === 'DEVUELTA') {
    botonTexto = 'Ver observaciones y corregir';
    botonVariant = 'contained';
    botonIcono = <EditOutlinedIcon fontSize="small" />;
  } else if (estadoEvaluacion === 'EN_CURSO') {
    botonTexto = 'Continuar evaluación';
    botonVariant = 'contained';
    botonIcono = <PlayArrowOutlinedIcon fontSize="small" />;
  } else if (
    estadoEvaluacion === 'EN_REVISION' ||
    estadoEvaluacion === 'APROBADA' ||
    estadoEvaluacion === 'FINALIZADA' ||
    estadoEvaluacion === 'CERRADA'
  ) {
    botonTexto = 'Ver evaluación';
    botonVariant = 'outlined';
    botonIcono = <VisibilityOutlinedIcon fontSize="small" />;
  }

  const botonElemento = (
    <Button
      fullWidth
      size="small"
      variant={botonVariant}
      color={estadoEvaluacion === 'DEVUELTA' ? 'error' : 'primary'}
      startIcon={botonIcono}
      disabled={!asignacion.evaluacionId || bloqueadoSinConexion}
      onClick={() => navigate(`/tecnico/evaluaciones/${asignacion.evaluacionId}`)}
    >
      {botonTexto}
    </Button>
  );

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {asignacion.caso.establecimiento.nombre}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Asignado el {new Date(asignacion.fechaAsignacion).toLocaleDateString()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
          <EstadoChip estado={asignacion.caso.estado} />
          {estadoEvaluacion === 'DEVUELTA' && <EstadoChip estado="Devuelta" />}
        </Box>
      </Box>

      {bloqueadoSinConexion ? (
        <Tooltip title="Conéctate a internet para realizar esta acción">
          <span>{botonElemento}</span>
        </Tooltip>
      ) : (
        botonElemento
      )}

      {!asignacion.evaluacionId && (
        <Typography variant="caption" color="text.secondary">
          Esta asignación todavía no tiene una evaluación asociada.
        </Typography>
      )}
    </Paper>
  );
}

function TablaAsignaciones() {
  const { data: asignaciones, isLoading, isError, error } = useEvaluacionesAsignadas();
  const sync = useSyncStatus();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isLoading) return <EstadoCarga etiqueta="Cargando tus asignaciones…" />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar tus asignaciones'}</Alert>;
  }
  if (!asignaciones || asignaciones.length === 0) {
    return (
      <EstadoVacio
        titulo={
          !sync.enLinea
            ? 'No hay casos asignados guardados en este dispositivo. Conéctate a internet para sincronizar.'
            : 'No tienes casos asignados todavía.'
        }
        icono={<AssignmentOutlinedIcon fontSize="large" />}
      />
    );
  }

  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {asignaciones.map((a) => (
        <TarjetaAsignacionTecnico key={a.id} asignacion={a} />
      ))}
    </Box>
  ) : (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Establecimiento</TableCell>
            <TableCell>Fecha de asignación</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Evaluación</TableCell>
            <TableCell>Acción</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {asignaciones.map((a) => (
            <FilaAsignacion key={a.id} asignacion={a} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ResumenAsignaciones() {
  const { data: asignaciones } = useEvaluacionesAsignadas();
  const total = asignaciones?.length ?? 0;
  const enCurso = asignaciones?.filter((a) => a.evaluacionEstado === 'EN_CURSO').length ?? 0;
  const completadas = asignaciones?.filter((a) =>
    a.evaluacionEstado === 'FINALIZADA' ||
    a.evaluacionEstado === 'EN_REVISION' ||
    a.evaluacionEstado === 'APROBADA' ||
    a.evaluacionEstado === 'CERRADA'
  ).length ?? 0;
  const devueltas = asignaciones?.filter((a) => a.evaluacionEstado === 'DEVUELTA').length ?? 0;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: devueltas > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' },
        gap: 2,
      }}
    >
      <StatCard
        icono={<AssignmentOutlinedIcon />}
        valor={total}
        etiqueta="Casos asignados"
        color="#2A6DB0"
      />
      <StatCard
        icono={<AssignmentOutlinedIcon />}
        valor={enCurso}
        etiqueta="En curso"
        color="#0288D1"
      />
      <StatCard
        icono={<AssignmentOutlinedIcon />}
        valor={completadas}
        etiqueta="Completadas / Enviadas"
        color="#2E7D32"
      />
      {devueltas > 0 && (
        <StatCard
          icono={<AssignmentOutlinedIcon />}
          valor={devueltas}
          etiqueta="Devueltas para corrección"
          color="#C62828"
        />
      )}
    </Box>
  );
}


export default function DashboardTecnico() {
  const sync = useSyncStatus();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader etiqueta="Técnico evaluador" titulo="Panel de técnico evaluador" icono={<AssignmentOutlinedIcon />} />

      {!sync.enLinea && (
        <Alert severity="info">
          Modo sin conexión: visualizando los casos asignados guardados en tu dispositivo. Puedes continuar con las evaluaciones descargadas.
        </Alert>
      )}

      <ResumenAsignaciones />

      <Box>
        <Typography variant="h6" gutterBottom>
          Mis casos asignados
        </Typography>
        <TablaAsignaciones />
      </Box>
    </Box>
  );
}
