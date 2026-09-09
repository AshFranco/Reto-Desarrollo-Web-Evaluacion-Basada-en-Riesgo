import { useState } from 'react';
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
import { useIniciarEvaluacion } from '@/lib/tecnico/useEvaluacion';
import type { AsignacionMia } from '@/lib/types';

function FilaAsignacion({ asignacion }: { asignacion: AsignacionMia }) {
  const navigate = useNavigate();
  const iniciar = useIniciarEvaluacion();
  const [error, setError] = useState<string | null>(null);

  async function abrirEvaluacion() {
    setError(null);
    if (!asignacion.evaluacionId) return;

    try {
      await iniciar.mutateAsync(asignacion.evaluacionId);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : '';
      // Si ya se había iniciado antes, no es un error real: el backend no
      // distingue "Iniciar" de "Continuar" en esta lista (no expone el
      // estado de la evaluación acá), así que se intenta iniciar siempre y,
      // si ya estaba iniciada, se continúa igual hacia la ejecución.
      if (!mensaje.includes('ya fue iniciada')) {
        setError(mensaje || 'Error al iniciar la evaluación');
        return;
      }
    }
    navigate(`/tecnico/evaluaciones/${asignacion.evaluacionId}`);
  }

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
          disabled={!asignacion.evaluacionId || iniciar.isPending}
          onClick={abrirEvaluacion}
        >
          {iniciar.isPending ? <CircularProgress size={18} /> : 'Iniciar / Continuar'}
        </Button>
        {error && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
            {error}
          </Typography>
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
