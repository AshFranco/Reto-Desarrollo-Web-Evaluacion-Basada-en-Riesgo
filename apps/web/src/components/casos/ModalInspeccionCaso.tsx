import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
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
  MenuItem,
  Select,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import { useCasoDetalle, useActualizarPrioridadCaso, useDesasignarEvaluador, useAsignarEvaluador } from '@/lib/coordinador/useCasos';
import { useReabrirExpediente } from '@/lib/coordinador/useExpedientes';
import { useTecnicos } from '@/lib/coordinador/useTecnicos';
import { EstadoChip } from '@/components/ui/EstadoChip';

interface ModalInspeccionCasoProps {
  casoId: string | null;
  open: boolean;
  onClose: () => void;
  soloLectura?: boolean;
}

export function ModalInspeccionCaso({ casoId, open, onClose, soloLectura = false }: ModalInspeccionCasoProps) {
  const { data: caso, isLoading, isError, error } = useCasoDetalle(open ? casoId : null);
  const actualizarPrioridad = useActualizarPrioridadCaso();
  const reabrir = useReabrirExpediente();
  const desasignar = useDesasignarEvaluador();
  const asignar = useAsignarEvaluador();
  const { data: tecnicos } = useTecnicos();

  const [confirmarReabrirOpen, setConfirmarReabrirOpen] = useState(false);
  const [errorReabrir, setErrorReabrir] = useState<string | null>(null);

  const [editandoTecnico, setEditandoTecnico] = useState(false);
  const [nuevoTecnicoId, setNuevoTecnicoId] = useState('');
  const [errorTecnico, setErrorTecnico] = useState<string | null>(null);
  const [confirmarDesvincularOpen, setConfirmarDesvincularOpen] = useState(false);

  const estaCerrado = Boolean(
    caso?.estado?.toLowerCase() === 'cerrado' || caso?.expediente?.estado?.toLowerCase() === 'cerrado'
  );
  const puedeModificar = !soloLectura && !estaCerrado;

  async function handleReabrir() {
    if (!caso) return;
    setErrorReabrir(null);
    try {
      await reabrir.mutateAsync(caso.id);
      setConfirmarReabrirOpen(false);
    } catch (err) {
      setErrorReabrir(err instanceof Error ? err.message : 'Error al reabrir el caso');
    }
  }

  async function handleDesvincular() {
    if (!caso) return;
    setErrorTecnico(null);
    try {
      await desasignar.mutateAsync(caso.id);
      setConfirmarDesvincularOpen(false);
      setEditandoTecnico(false);
    } catch (err) {
      setErrorTecnico(err instanceof Error ? err.message : 'Error al desvincular el técnico');
    }
  }

  async function handleCambiarTecnico() {
    if (!caso || !nuevoTecnicoId) return;
    setErrorTecnico(null);
    try {
      await asignar.mutateAsync({ casoId: caso.id, evaluadorId: nuevoTecnicoId });
      setEditandoTecnico(false);
      setNuevoTecnicoId('');
    } catch (err) {
      setErrorTecnico(err instanceof Error ? err.message : 'Error al asignar el técnico');
    }
  }

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityOutlinedIcon color="primary" />
          Inspección Detallada del Caso {casoId ? `#${casoId}` : ''}
        </Box>
        {soloLectura && (
          <Chip
            label="Modo solo lectura"
            size="small"
            variant="outlined"
            sx={{
              bgcolor: 'rgba(71, 85, 105, 0.08)',
              borderColor: 'rgba(71, 85, 105, 0.25)',
              color: 'text.secondary',
              fontWeight: 600,
            }}
          />
        )}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      Origen: <strong>{caso.origen?.nombre ?? 'No especificado'}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">· Prioridad:</Typography>
                    {!puedeModificar ? (
                      <Tooltip title={soloLectura ? 'Modo solo lectura' : 'La prioridad no puede modificarse en casos cerrados'}>
                        <span>
                          <Chip
                            label={caso.prioridad ?? 'NORMAL'}
                            size="small"
                            variant="outlined"
                            sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
                          />
                        </span>
                      </Tooltip>
                    ) : (
                      <Select
                        size="small"
                        value={caso.prioridad ?? 'NORMAL'}
                        onChange={(e) => actualizarPrioridad.mutate({ casoId: caso.id, prioridad: e.target.value })}
                        disabled={actualizarPrioridad.isPending}
                        sx={{
                          fontSize: '0.75rem',
                          height: 24,
                          '& .MuiSelect-select': { py: 0.25, px: 1 },
                        }}
                      >
                        <MenuItem value="BAJA">Baja</MenuItem>
                        <MenuItem value="NORMAL">Normal</MenuItem>
                        <MenuItem value="ALTA">Alta</MenuItem>
                        <MenuItem value="URGENTE">Urgente</MenuItem>
                      </Select>
                    )}
                  </Box>
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

                    {errorTecnico && (
                      <Alert severity="error" sx={{ mt: 1, py: 0, px: 1, fontSize: '0.75rem' }}>
                        {errorTecnico}
                      </Alert>
                    )}

                    {puedeModificar && (
                      <Box sx={{ mt: 1 }}>
                        {!editandoTecnico ? (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditOutlinedIcon />}
                              onClick={() => setEditandoTecnico(true)}
                              sx={{ fontSize: '0.75rem', py: 0.25 }}
                            >
                              {caso.asignaciones && caso.asignaciones.length > 0 && caso.asignaciones[0]?.evaluador
                                ? 'Cambiar técnico'
                                : 'Asignar técnico'}
                            </Button>
                            {caso.asignaciones && caso.asignaciones.length > 0 && caso.asignaciones[0]?.evaluador && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<PersonRemoveOutlinedIcon />}
                                onClick={() => setConfirmarDesvincularOpen(true)}
                                sx={{ fontSize: '0.75rem', py: 0.25 }}
                              >
                                Desvincular
                              </Button>
                            )}
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
                            <Select
                              size="small"
                              value={nuevoTecnicoId}
                              onChange={(e) => setNuevoTecnicoId(e.target.value)}
                              displayEmpty
                              sx={{ minWidth: 200, height: 32, fontSize: '0.75rem' }}
                            >
                              <MenuItem value="" disabled>
                                <em>Seleccionar técnico...</em>
                              </MenuItem>
                              {(tecnicos ?? []).map((t) => (
                                <MenuItem key={t.id} value={t.id} sx={{ fontSize: '0.8125rem' }}>
                                  {t.nombreCompleto}
                                </MenuItem>
                              ))}
                            </Select>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={!nuevoTecnicoId || asignar.isPending}
                              onClick={handleCambiarTecnico}
                              sx={{ fontSize: '0.75rem' }}
                            >
                              {asignar.isPending ? <CircularProgress size={14} /> : 'Guardar'}
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                setEditandoTecnico(false);
                                setNuevoTecnicoId('');
                              }}
                              sx={{ fontSize: '0.75rem' }}
                            >
                              Cancelar
                            </Button>
                          </Box>
                        )}
                      </Box>
                    )}
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
                isMobile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {caso.evaluaciones.map((ev: any) => (
                      <Paper key={ev.id} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            #{ev.id}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ev.fechaInicio ? new Date(ev.fechaInicio).toLocaleDateString() : 'Sin fecha'}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={ev.bloqueada ? 'Finalizada' : 'En proceso'}
                          color={ev.bloqueada ? 'success' : 'info'}
                          variant="outlined"
                        />
                      </Paper>
                    ))}
                  </Box>
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
                )
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

      <DialogActions sx={{ px: 3, py: 2, display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
          {!soloLectura && estaCerrado && (
            <Button
              variant="outlined"
              color="primary"
              fullWidth={isMobile}
              startIcon={<LockOpenOutlinedIcon />}
              onClick={() => {
                setErrorReabrir(null);
                setConfirmarReabrirOpen(true);
              }}
            >
              Reabrir caso
            </Button>
          )}
        </Box>
        <Button onClick={onClose} variant="contained" fullWidth={isMobile}>
          Cerrar
        </Button>
      </DialogActions>

      {/* Diálogo para confirmar reapertura */}
      <Dialog open={confirmarReabrirOpen} onClose={() => setConfirmarReabrirOpen(false)}>
        <DialogTitle>Confirmar reapertura del caso</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas reabrir el caso <strong>#{caso?.id}</strong> ({caso?.establecimiento?.nombre})?
            El caso pasará a estado activo y podrá ser gestionado nuevamente.
          </DialogContentText>
          {errorReabrir && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorReabrir}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarReabrirOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={reabrir.isPending}
            onClick={handleReabrir}
          >
            {reabrir.isPending ? <CircularProgress size={16} color="inherit" /> : 'Confirmar reapertura'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para confirmar desvinculación */}
      <Dialog open={confirmarDesvincularOpen} onClose={() => setConfirmarDesvincularOpen(false)}>
        <DialogTitle>Confirmar desvinculación de técnico</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas desvincular al técnico evaluador de este caso? El caso volverá a estado <strong>Pendiente</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarDesvincularOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={desasignar.isPending}
            onClick={handleDesvincular}
          >
            {desasignar.isPending ? <CircularProgress size={16} color="inherit" /> : 'Confirmar desvinculación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
