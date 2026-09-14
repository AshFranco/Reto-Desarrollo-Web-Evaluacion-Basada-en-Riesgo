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
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { useCasoDetalle } from '@/lib/coordinador/useCasos';
import { EstadoChip } from '@/components/ui/EstadoChip';

interface ModalInspeccionCasoProps {
  casoId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ModalInspeccionCaso({ casoId, open, onClose }: ModalInspeccionCasoProps) {
  const { data: caso, isLoading, isError, error } = useCasoDetalle(open ? casoId : null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <VisibilityOutlinedIcon color="primary" />
        Inspección Detallada del Caso {casoId ? `#${casoId}` : ''}
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, gap: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2">Cargando expediente completo...</Typography>
          </Box>
        )}

        {isError && (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'No se pudo cargar el detalle del caso.'}
          </Alert>
        )}

        {!isLoading && !isError && caso && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Cabecera general */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Caso #{caso.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Origen: <strong>{caso.origen?.nombre ?? 'No especificado'}</strong> · Prioridad: <strong>{caso.prioridad ?? 'NORMAL'}</strong>
                  </Typography>
                </Box>
                <EstadoChip estado={caso.estado} />
              </Box>
            </Paper>

            {/* Datos de Empresa y Establecimiento */}
            <Box>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <BusinessOutlinedIcon fontSize="small" color="action" />
                Establecimiento y Empresa
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Razón Social</Typography>
                    <Typography variant="body2" fontWeight={500}>{caso.establecimiento.empresa?.razonSocial ?? '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">RNC: {caso.establecimiento.empresa?.rnc ?? '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Establecimiento</Typography>
                    <Typography variant="body2" fontWeight={500}>{caso.establecimiento.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">{caso.establecimiento.calle || 'Sin dirección'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Técnico Evaluador Asignado</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {caso.asignaciones && caso.asignaciones.length > 0 && caso.asignaciones[0]?.evaluador
                        ? caso.asignaciones[0]?.evaluador?.nombreCompleto
                        : 'Sin técnico asignado'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>

            {/* Evaluaciones asociadas */}
            <Box>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <FactCheckOutlinedIcon fontSize="small" color="action" />
                Evaluaciones Sanitarias ({caso.evaluaciones?.length ?? 0})
              </Typography>
              {!caso.evaluaciones || caso.evaluaciones.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No hay evaluaciones registradas en este caso.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID Evaluación</TableCell>
                        <TableCell>Inicio</TableCell>
                        <TableCell>Finalización</TableCell>
                        <TableCell>Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {caso.evaluaciones.map((ev: any) => (
                        <TableRow key={ev.id}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>#{ev.id}</TableCell>
                          <TableCell>{ev.fechaInicio ? new Date(ev.fechaInicio).toLocaleDateString() : '—'}</TableCell>
                          <TableCell>{ev.fechaFinalizacion ? new Date(ev.fechaFinalizacion).toLocaleDateString() : '—'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={ev.bloqueada ? 'Finalizada' : 'En proceso'}
                              color={ev.bloqueada ? 'success' : 'info'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {/* Expediente Final (si existe) */}
            {caso.expediente && (
              <Box>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <AssignmentOutlinedIcon fontSize="small" color="action" />
                  Resolución del Expediente
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F4FBF7', borderColor: 'success.light' }}>
                  <Typography variant="body2" fontWeight={600} color="success.dark">
                    {caso.expediente.resultadoFinal ?? 'Expediente procesado.'}
                  </Typography>
                  {caso.expediente.fechaCierre && (
                    <Typography variant="caption" color="text.secondary">
                      Fecha de cierre formal: {new Date(caso.expediente.fechaCierre).toLocaleDateString()}
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
