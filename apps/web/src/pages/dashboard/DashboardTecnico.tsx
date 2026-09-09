import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEvaluacionesAsignadas } from '@/lib/tecnico/useEvaluacionesAsignadas';
import type { AsignacionMia } from '@/lib/types';

/**
 * Antes este botón llamaba a POST .../iniciar y trataba "ya fue iniciada"
 * como no-error para navegar igual (no había forma de saber el estado real
 * desde esta lista). Ahora navega directo: EjecutarEvaluacion.tsx conoce el
 * estado real de la evaluación y decide ahí si hace falta iniciarla —
 * online contra el servidor, o encolada si no hay conexión (ver
 * useSincronizacionEvaluacion.ts). Así también funciona sin red: navegar
 * no depende de ninguna llamada al servidor.
 */
function FilaAsignacion({ asignacion }: { asignacion: AsignacionMia }) {
  const navigate = useNavigate();

  return (
    <TableRow>
      <TableCell>{asignacion.caso.establecimiento.nombre}</TableCell>
      <TableCell>{new Date(asignacion.fechaAsignacion).toLocaleDateString()}</TableCell>
      <TableCell>
        <Chip size="small" label={asignacion.caso.estado} />
      </TableCell>
      <TableCell>
        <Button
          size="small"
          variant="contained"
          disabled={!asignacion.evaluacionId}
          onClick={() => navigate(`/tecnico/evaluaciones/${asignacion.evaluacionId}`)}
        >
          Iniciar / Continuar
        </Button>
        {!asignacion.evaluacionId && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Esta asignación todavía no tiene una evaluación asociada.
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
}

function TablaAsignaciones() {
  const { data: asignaciones, isLoading, isError, error } = useEvaluacionesAsignadas();

  if (isLoading) return <CircularProgress size={24} />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar tus asignaciones'}</Alert>;
  }
  if (!asignaciones || asignaciones.length === 0) {
    return <Typography color="text.secondary">No tenés casos asignados todavía.</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Establecimiento</TableCell>
            <TableCell>Fecha de asignación</TableCell>
            <TableCell>Estado</TableCell>
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

export default function DashboardTecnico() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4">Panel de Técnico Evaluador</Typography>

      <Box>
        <Typography variant="h6" gutterBottom>
          Mis casos asignados
        </Typography>
        <TablaAsignaciones />
      </Box>
    </Box>
  );
}
