import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
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
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import { useCasos, useCasoDetalle, useAsignarEvaluador, useDesasignarEvaluador } from '@/lib/coordinador/useCasos';
import { useTecnicos } from '@/lib/coordinador/useTecnicos';
import { ModalInspeccionCaso } from '@/components/casos/ModalInspeccionCaso';

import { useCalendario } from '@/lib/coordinador/useCalendario';
import {
  useInformesPendientes,
  useInformesDevueltos,
  useRevisarInforme,
  useDeshacerDevolucion,
  type AccionRevision,
  type InformePendiente,
  type InformeDevuelto,
} from '@/lib/coordinador/useInformesPendientes';
import {
  useExpedientes,
  useCasosCerrables,
  useCerrarExpediente,
  useReabrirExpediente,
  type CasoCerrable,
} from '@/lib/coordinador/useExpedientes';
import type { CasoResumen, Expediente } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoChip } from '@/components/ui/EstadoChip';

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
  const desasignar = useDesasignarEvaluador();
  const [editandoAsignacion, setEditandoAsignacion] = useState(false);
  const [errorDesasignar, setErrorDesasignar] = useState<string | null>(null);

  const [confirmarDesvincularOpen, setConfirmarDesvincularOpen] = useState(false);

  if (isLoading) return <EstadoCarga />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar el detalle'}</Alert>;
  }
  if (!detalle) return null;

  // sinAsignar verifica la PRESENCIA REAL de un evaluador en las asignaciones,
  // no el estado del caso. Esto evita la condición contradictoria anterior en la
  // que casos con estado ≠ 'Pendiente' pero sin evaluador mostraban
  // "Este caso ya tiene un evaluador asignado" de forma incorrecta.
  const tieneEvaluadorAsignado =
    (detalle.asignaciones?.length ?? 0) > 0 &&
    Boolean(detalle.asignaciones?.[0]?.evaluador);
  const estaCerrado = detalle.estado === 'Cerrado';

  async function handleDesasignar() {
    setErrorDesasignar(null);
    try {
      await desasignar.mutateAsync(casoId);
      setEditandoAsignacion(false);
      setConfirmarDesvincularOpen(false);
    } catch (err) {
      setErrorDesasignar(err instanceof Error ? err.message : 'Error al desvincular el técnico');
    }
  }

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

      {errorDesasignar && (
        <Alert severity="error" sx={{ mt: 1 }}>{errorDesasignar}</Alert>
      )}

      {estaCerrado ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Este caso se encuentra cerrado y no puede recibir nuevas asignaciones.
        </Alert>
      ) : tieneEvaluadorAsignado && !editandoAsignacion ? (
        <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2">
              Técnico evaluador: <strong>{detalle.asignaciones?.[0]?.evaluador?.nombreCompleto}</strong>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setEditandoAsignacion(true)}
              >
                Cambiar técnico
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={desasignar.isPending ? <CircularProgress size={16} /> : <PersonRemoveOutlinedIcon />}
                disabled={desasignar.isPending}
                onClick={() => setConfirmarDesvincularOpen(true)}
              >
                Desvincular técnico
              </Button>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          <FormularioAsignar casoId={casoId} />
          {editandoAsignacion && (
            <Button size="small" sx={{ mt: 1 }} onClick={() => setEditandoAsignacion(false)}>
              Cancelar reasignación
            </Button>
          )}
        </Box>
      )}

      <Dialog open={confirmarDesvincularOpen} onClose={() => setConfirmarDesvincularOpen(false)}>
        <DialogTitle>Confirmar desvinculación de técnico</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas desvincular al técnico evaluador <strong>{detalle.asignaciones?.[0]?.evaluador?.nombreCompleto}</strong> de este caso? El caso volverá al estado <strong>Pendiente</strong> para permitir una nueva asignación.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarDesvincularOpen(false)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={desasignar.isPending}
            onClick={handleDesasignar}
          >
            {desasignar.isPending ? <CircularProgress size={16} color="inherit" /> : 'Confirmar desvinculación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


function TarjetaCaso({
  caso,
  onInspeccionar,
  onReabrir,
}: {
  caso: CasoResumen;
  onInspeccionar: (id: string) => void;
  onReabrir: (caso: CasoResumen) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const evaluadorAsignado = caso.asignaciones[0]?.evaluador?.nombreCompleto ?? null;
  const estaCerrado = caso.estado?.toLowerCase() === 'cerrado';

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {caso.establecimiento.nombre}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Origen: <strong>{caso.origen?.nombre ?? '—'}</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Chip
            label={caso.prioridad ?? 'NORMAL'}
            size="small"
            variant="outlined"
            color={
              caso.prioridad === 'URGENTE' || caso.prioridad === 'ALTA'
                ? 'error'
                : caso.prioridad === 'BAJA'
                ? 'info'
                : 'default'
            }
          />
          <EstadoChip estado={caso.estado} />
        </Box>
      </Box>

      <Box sx={{ p: 1.25, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Técnico evaluador:
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" fontWeight={500}>
            {evaluadorAsignado ?? (estaCerrado ? 'Sin asignar (cerrado)' : 'Sin técnico asignado')}
          </Typography>
          {!estaCerrado && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => setAbierto((prev) => !prev)}
              sx={{ fontSize: '0.75rem', py: 0.25 }}
            >
              {evaluadorAsignado ? 'Gestionar técnico' : 'Asignar técnico'}
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap', pt: 0.5 }}>
        {estaCerrado && (
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<LockOpenOutlinedIcon />}
            onClick={() => onReabrir(caso)}
          >
            Reabrir caso
          </Button>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<VisibilityOutlinedIcon />}
          onClick={() => onInspeccionar(caso.id)}
        >
          Inspeccionar
        </Button>
        <IconButton size="small" onClick={() => setAbierto(!abierto)}>
          {abierto ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </Box>

      <Collapse in={abierto} unmountOnExit>
        <Divider sx={{ my: 1 }} />
        <DetalleCaso casoId={caso.id} />
      </Collapse>
    </Paper>
  );
}

function FilaCaso({
  caso,
  onInspeccionar,
  onReabrir,
}: {
  caso: CasoResumen;
  onInspeccionar: (id: string) => void;
  onReabrir: (caso: CasoResumen) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const evaluadorAsignado = caso.asignaciones[0]?.evaluador?.nombreCompleto ?? null;
  const estaCerrado = caso.estado?.toLowerCase() === 'cerrado';

  return (
    <>
      <TableRow hover>
        <TableCell width={40}>
          <IconButton size="small" onClick={() => setAbierto(!abierto)}>
            {abierto ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{caso.origen?.nombre ?? '—'}</TableCell>
        <TableCell sx={{ minWidth: 200 }}>
          <Typography variant="body2" fontWeight={600}>{caso.establecimiento.nombre}</Typography>
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <EstadoChip estado={caso.estado} />
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Chip
            label={caso.prioridad ?? 'NORMAL'}
            size="small"
            variant="outlined"
            color={
              caso.prioridad === 'URGENTE' || caso.prioridad === 'ALTA'
                ? 'error'
                : caso.prioridad === 'BAJA'
                ? 'info'
                : 'default'
            }
          />
        </TableCell>
        <TableCell sx={{ minWidth: 200 }}>
          {evaluadorAsignado ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="body2">{evaluadorAsignado}</Typography>
              {!estaCerrado && (
                <Tooltip title="Cambiar o desvincular técnico">
                  <IconButton size="small" onClick={() => setAbierto(true)} color="primary">
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ) : estaCerrado ? (
            <Typography variant="body2" color="text.secondary">
              Sin asignar
            </Typography>
          ) : (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => setAbierto(true)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Asignar técnico
            </Button>
          )}
        </TableCell>
        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<VisibilityOutlinedIcon />}
              onClick={() => onInspeccionar(caso.id)}
            >
              Inspeccionar
            </Button>
            {estaCerrado && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<LockOpenOutlinedIcon />}
                onClick={() => onReabrir(caso)}
              >
                Reabrir
              </Button>
            )}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ paddingTop: 0, paddingBottom: 0 }}>
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
  const reabrir = useReabrirExpediente();
  const [filtroActivos, setFiltroActivos] = useState(true);
  const [casoAInspeccionar, setCasoAInspeccionar] = useState<string | null>(null);
  const [casoAReabrir, setCasoAReabrir] = useState<CasoResumen | null>(null);
  const [errorReabrir, setErrorReabrir] = useState<string | null>(null);

  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down('md'));

  async function handleConfirmarReabrir() {
    if (!casoAReabrir) return;
    setErrorReabrir(null);
    try {
      await reabrir.mutateAsync(casoAReabrir.id);
      setCasoAReabrir(null);
    } catch (err) {
      setErrorReabrir(err instanceof Error ? err.message : 'Error al reabrir el caso');
    }
  }

  if (isLoading) return <EstadoCarga />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar los casos'}</Alert>;
  }
  if (!casos || casos.length === 0) {
    return <EstadoVacio titulo="No hay casos registrados." icono={<FolderOutlinedIcon fontSize="large" />} />;
  }

  const casosActivos = casos.filter((c) => c.estado?.toLowerCase() !== 'cerrado');
  const casosAMostrar = filtroActivos ? casosActivos : casos;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip
          label={`Casos activos (${casosActivos.length})`}
          color={filtroActivos ? 'primary' : 'default'}
          variant={filtroActivos ? 'filled' : 'outlined'}
          onClick={() => setFiltroActivos(true)}
          size="small"
          clickable
        />
        <Chip
          label={`Todos los casos (${casos.length})`}
          color={!filtroActivos ? 'primary' : 'default'}
          variant={!filtroActivos ? 'filled' : 'outlined'}
          onClick={() => setFiltroActivos(false)}
          size="small"
          clickable
        />
      </Box>

      {esMovil ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {casosAMostrar.map((caso) => (
            <TarjetaCaso
              key={caso.id}
              caso={caso}
              onInspeccionar={(id) => setCasoAInspeccionar(id)}
              onReabrir={(c) => {
                setErrorReabrir(null);
                setCasoAReabrir(c);
              }}
            />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ width: '100%', overflowX: 'auto', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={40} />
                <TableCell>Origen</TableCell>
                <TableCell>Establecimiento</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Prioridad</TableCell>
                <TableCell>Evaluador</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {casosAMostrar.map((caso) => (
                <FilaCaso
                  key={caso.id}
                  caso={caso}
                  onInspeccionar={(id) => setCasoAInspeccionar(id)}
                  onReabrir={(c) => {
                    setErrorReabrir(null);
                    setCasoAReabrir(c);
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ModalInspeccionCaso
        casoId={casoAInspeccionar}
        open={Boolean(casoAInspeccionar)}
        onClose={() => setCasoAInspeccionar(null)}
      />

      <Dialog open={Boolean(casoAReabrir)} onClose={() => setCasoAReabrir(null)}>
        <DialogTitle>Confirmar reapertura del caso</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas reabrir el caso <strong>#{casoAReabrir?.id}</strong> ({casoAReabrir?.establecimiento?.nombre})?
            El expediente y caso pasarán a estado activo para permitir una nueva asignación y gestión.
          </DialogContentText>
          {errorReabrir && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorReabrir}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCasoAReabrir(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={reabrir.isPending}
            onClick={handleConfirmarReabrir}
          >
            {reabrir.isPending ? <CircularProgress size={16} color="inherit" /> : 'Confirmar reapertura'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


function Calendario() {
  const { data: tecnicos, isLoading: cargandoTecnicos } = useTecnicos();
  const [evaluadorId, setEvaluadorId] = useState('');
  const { data: eventos, isLoading, isError, error } = useCalendario(evaluadorId || undefined);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
        <Typography color="text.secondary">Selecciona un técnico para ver su calendario.</Typography>
      )}

      {evaluadorId && isLoading && <CircularProgress size={24} />}
      {evaluadorId && isError && (
        <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar el calendario'}</Alert>
      )}
      {evaluadorId && eventos && eventos.length === 0 && (
        <Typography color="text.secondary">Este técnico no tiene evaluaciones programadas.</Typography>
      )}
      {evaluadorId && eventos && eventos.length > 0 && (
        isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {eventos.map((ev) => (
              <Paper key={ev.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {ev.establecimiento.nombre}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Fecha programada: <strong>{ev.fechaProgramada ? new Date(ev.fechaProgramada).toLocaleDateString() : 'Sin fecha asignada'}</strong>
                </Typography>
              </Paper>
            ))}
          </Box>
        ) : (
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
        )
      )}
    </Box>
  );
}

function FilaInformePendiente({ informe }: { informe: InformePendiente }) {
  const revisar = useRevisarInforme();
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [accionModal, setAccionModal] = useState<AccionRevision | null>(null);

  async function ejecutar(accion: AccionRevision) {
    setError(null);
    setExito(null);
    setAccionModal(null);
    try {
      await revisar.mutateAsync({
        evaluacionId: informe.evaluacionId,
        accion,
        observaciones: observaciones.trim() || undefined,
      });
      setExito(
        accion === 'APROBAR'
          ? 'Informe aprobado exitosamente. Listo para cierre de expediente.'
          : 'Informe devuelto al técnico. Disponible en la sección "Informes devueltos / en corrección".'
      );
      setObservaciones('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revisar el informe');
    }
  }

  return (
    <>
      <TableRow>
        <TableCell>{informe.empresa}</TableCell>
        <TableCell>{informe.establecimiento}</TableCell>
        <TableCell sx={{ minWidth: 220 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Observaciones (opcional)"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            disabled={revisar.isPending}
          />
          {error && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
              {error}
            </Typography>
          )}
          {exito && (
            <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
              {exito}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={revisar.isPending}
              onClick={() => setAccionModal('APROBAR')}
            >
              Aprobar
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={revisar.isPending}
              onClick={() => setAccionModal('DEVOLVER')}
              sx={{
                borderColor: 'rgba(15, 23, 42, 0.20)',
                color: 'text.primary',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              Devolver para corrección
            </Button>
          </Box>
        </TableCell>
      </TableRow>

      <Dialog open={Boolean(accionModal)} onClose={() => setAccionModal(null)}>
        <DialogTitle>
          {accionModal === 'APROBAR'
            ? 'Confirmar aprobación de informe'
            : 'Confirmar devolución al técnico evaluador'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {accionModal === 'APROBAR' ? (
              <>
                ¿Confirmas la aprobación del informe de evaluación para <strong>{informe.establecimiento}</strong> ({informe.empresa})?
                Una vez aprobado, el caso se habilitará en la bandeja de <strong>Expedientes pendientes de cierre</strong>.
              </>
            ) : (
              <>
                ¿Confirmas la devolución del informe de <strong>{informe.establecimiento}</strong> al técnico evaluador?
                {observaciones.trim() ? (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption"><strong>Observaciones registradas:</strong> {observaciones}</Typography>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    (Puedes incluir observaciones antes de confirmar para guiar al técnico en las correcciones requeridas).
                  </Typography>
                )}
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccionModal(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={accionModal === 'APROBAR' ? 'primary' : 'inherit'}
            disabled={revisar.isPending}
            onClick={() => accionModal && ejecutar(accionModal)}
            sx={accionModal !== 'APROBAR' ? { bgcolor: '#334155', color: '#fff', '&:hover': { bgcolor: '#1E293B' } } : undefined}
          >
            {revisar.isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : accionModal === 'APROBAR' ? (
              'Aprobar informe'
            ) : (
              'Confirmar devolución'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function TarjetaInformePendiente({ informe }: { informe: InformePendiente }) {
  const revisar = useRevisarInforme();
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [accionModal, setAccionModal] = useState<AccionRevision | null>(null);

  async function ejecutar(accion: AccionRevision) {
    setError(null);
    setExito(null);
    setAccionModal(null);
    try {
      await revisar.mutateAsync({
        evaluacionId: informe.evaluacionId,
        accion,
        observaciones: observaciones.trim() || undefined,
      });
      setExito(
        accion === 'APROBAR'
          ? 'Informe aprobado exitosamente. Listo para cierre de expediente.'
          : 'Informe devuelto al técnico. Disponible en la sección "Informes devueltos / en corrección".'
      );
      setObservaciones('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revisar el informe');
    }
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            {informe.establecimiento}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {informe.empresa}
          </Typography>
        </Box>

        <TextField
          size="small"
          fullWidth
          placeholder="Observaciones (opcional)"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          disabled={revisar.isPending}
        />
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
        {exito && (
          <Typography variant="caption" color="success.main">
            {exito}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            fullWidth
            size="small"
            variant="contained"
            color="primary"
            disabled={revisar.isPending}
            onClick={() => setAccionModal('APROBAR')}
          >
            Aprobar informe
          </Button>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            disabled={revisar.isPending}
            onClick={() => setAccionModal('DEVOLVER')}
            sx={{
              borderColor: 'rgba(15, 23, 42, 0.20)',
              color: 'text.primary',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            Devolver para corrección
          </Button>
        </Box>
      </Paper>

      <Dialog open={Boolean(accionModal)} onClose={() => setAccionModal(null)}>
        <DialogTitle>
          {accionModal === 'APROBAR'
            ? 'Confirmar aprobación de informe'
            : 'Confirmar devolución al técnico evaluador'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {accionModal === 'APROBAR' ? (
              <>
                ¿Confirmas la aprobación del informe de evaluación para <strong>{informe.establecimiento}</strong> ({informe.empresa})?
                Una vez aprobado, el caso se habilitará en la bandeja de <strong>Expedientes pendientes de cierre</strong>.
              </>
            ) : (
              <>
                ¿Confirmas la devolución del informe de <strong>{informe.establecimiento}</strong> al técnico evaluador?
                {observaciones.trim() ? (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption"><strong>Observaciones registradas:</strong> {observaciones}</Typography>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    (Puedes incluir observaciones antes de confirmar para guiar al técnico en las correcciones requeridas).
                  </Typography>
                )}
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccionModal(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={accionModal === 'APROBAR' ? 'primary' : 'inherit'}
            disabled={revisar.isPending}
            onClick={() => accionModal && ejecutar(accionModal)}
            sx={accionModal !== 'APROBAR' ? { bgcolor: '#334155', color: '#fff', '&:hover': { bgcolor: '#1E293B' } } : undefined}
          >
            {revisar.isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : accionModal === 'APROBAR' ? (
              'Aprobar informe'
            ) : (
              'Confirmar devolución'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function SeccionInformesPendientes() {
  const { data: pendientes, isLoading } = useInformesPendientes();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isLoading) return <EstadoCarga />;
  if (pendientes.length === 0) {
    return <EstadoVacio titulo="No hay informes pendientes de revisión." icono={<AssignmentTurnedInOutlinedIcon fontSize="large" />} />;
  }

  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {pendientes.map((p) => (
        <TarjetaInformePendiente key={p.evaluacionId} informe={p} />
      ))}
    </Box>
  ) : (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Empresa</TableCell>
            <TableCell>Establecimiento</TableCell>
            <TableCell>Observaciones</TableCell>
            <TableCell>Acción</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pendientes.map((p) => (
            <FilaInformePendiente key={p.evaluacionId} informe={p} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function FilaInformeDevuelto({
  informe,
}: {
  informe: InformeDevuelto;
}) {
  const deshacer = useDeshacerDevolucion();
  const [confirmarDeshacer, setConfirmarDeshacer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeshacer() {
    setError(null);
    try {
      await deshacer.mutateAsync({ evaluacionId: informe.evaluacionId, casoId: informe.casoId });
      setConfirmarDeshacer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revertir la devolución');
    }
  }

  return (
    <>
      <TableRow>
        <TableCell>{informe.empresa}</TableCell>
        <TableCell>{informe.establecimiento}</TableCell>
        <TableCell>
          <Chip
            label="Devuelta para corrección técnica"
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'rgba(15, 23, 42, 0.16)',
              color: 'text.secondary',
              fontWeight: 600,
              bgcolor: 'rgba(15, 23, 42, 0.02)',
            }}
          />
          {error && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </TableCell>
        <TableCell align="right">
          <Button
            size="small"
            variant="outlined"
            color="info"
            startIcon={deshacer.isPending ? <CircularProgress size={16} /> : <UndoOutlinedIcon />}
            disabled={deshacer.isPending}
            onClick={() => setConfirmarDeshacer(true)}
          >
            Deshacer devolución
          </Button>
        </TableCell>
      </TableRow>

      <Dialog open={confirmarDeshacer} onClose={() => setConfirmarDeshacer(false)}>
        <DialogTitle>Deshacer devolución de informe</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Deseas revertir la devolución del informe del establecimiento <strong>{informe.establecimiento}</strong>?
            El informe volverá inmediatamente a la bandeja de <strong>Informes pendientes de revisión</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarDeshacer(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="info"
            disabled={deshacer.isPending}
            onClick={handleDeshacer}
          >
            {deshacer.isPending ? <CircularProgress size={16} color="inherit" /> : 'Revertir a En Revisión'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function TarjetaInformeDevuelto({
  informe,
}: {
  informe: InformeDevuelto;
}) {
  const deshacer = useDeshacerDevolucion();
  const [confirmarDeshacer, setConfirmarDeshacer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeshacer() {
    setError(null);
    try {
      await deshacer.mutateAsync({ evaluacionId: informe.evaluacionId, casoId: informe.casoId });
      setConfirmarDeshacer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revertir la devolución');
    }
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {informe.establecimiento}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {informe.empresa}
            </Typography>
          </Box>
          <Chip
            label="En corrección"
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'rgba(15, 23, 42, 0.16)',
              color: 'text.secondary',
              fontWeight: 600,
              bgcolor: 'rgba(15, 23, 42, 0.02)',
            }}
          />
        </Box>
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
          <Button
            size="small"
            variant="outlined"
            color="info"
            startIcon={deshacer.isPending ? <CircularProgress size={16} /> : <UndoOutlinedIcon />}
            disabled={deshacer.isPending}
            onClick={() => setConfirmarDeshacer(true)}
          >
            Deshacer devolución
          </Button>
        </Box>
      </Paper>

      <Dialog open={confirmarDeshacer} onClose={() => setConfirmarDeshacer(false)}>
        <DialogTitle>Deshacer devolución de informe</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Deseas revertir la devolución del informe del establecimiento <strong>{informe.establecimiento}</strong>?
            El informe volverá inmediatamente a la bandeja de <strong>Informes pendientes de revisión</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarDeshacer(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="info"
            disabled={deshacer.isPending}
            onClick={handleDeshacer}
          >
            {deshacer.isPending ? <CircularProgress size={16} color="inherit" /> : 'Revertir a En Revisión'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function SeccionInformesDevueltos() {
  const { data: devueltos, isLoading } = useInformesDevueltos();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isLoading) return <EstadoCarga />;
  if (devueltos.length === 0) {
    return (
      <EstadoVacio
        titulo="No hay informes devueltos en corrección."
        icono={<FactCheckOutlinedIcon fontSize="large" />}
      />
    );
  }

  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {devueltos.map((d) => (
        <TarjetaInformeDevuelto key={d.evaluacionId} informe={d} />
      ))}
    </Box>
  ) : (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Empresa</TableCell>
            <TableCell>Establecimiento</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {devueltos.map((d) => (
            <FilaInformeDevuelto key={d.evaluacionId} informe={d} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function TarjetaCasoCerrable({ caso }: { caso: CasoCerrable }) {
  const cerrar = useCerrarExpediente();
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar() {
    setError(null);
    try {
      await cerrar.mutateAsync(caso.casoId);
      setConfirmarCierre(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar el expediente');
    }
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            {caso.establecimiento}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {caso.empresa}
          </Typography>
        </Box>
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
        <Button
          size="small"
          variant="contained"
          color="success"
          fullWidth
          disabled={cerrar.isPending}
          onClick={() => setConfirmarCierre(true)}
        >
          Cerrar expediente
        </Button>
      </Paper>

      <Dialog open={confirmarCierre} onClose={() => setConfirmarCierre(false)}>
        <DialogTitle>Confirmar cierre definitivo de expediente</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas cerrar el expediente del caso para <strong>{caso.establecimiento}</strong> ({caso.empresa})?
            Esta acción concluirá el proceso de evaluación y registrará el caso como <strong>Cerrado</strong> en el histórico institucional.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarCierre(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            disabled={cerrar.isPending}
            onClick={ejecutar}
          >
            {cerrar.isPending ? <CircularProgress size={16} color="inherit" /> : 'Confirmar cierre'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function FilaCasoCerrable({ caso }: { caso: CasoCerrable }) {
  const cerrar = useCerrarExpediente();
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar() {
    setError(null);
    try {
      await cerrar.mutateAsync(caso.casoId);
      setConfirmarCierre(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar el expediente');
    }
  }

  return (
    <>
      <TableRow>
        <TableCell>{caso.empresa}</TableCell>
        <TableCell>{caso.establecimiento}</TableCell>
        <TableCell>
          <Button
            size="small"
            variant="contained"
            color="success"
            disabled={cerrar.isPending}
            onClick={() => setConfirmarCierre(true)}
          >
            Cerrar expediente
          </Button>
          {error && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </TableCell>
      </TableRow>

      <Dialog open={confirmarCierre} onClose={() => setConfirmarCierre(false)}>
        <DialogTitle>Confirmar cierre definitivo de expediente</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas cerrar el expediente del caso para <strong>{caso.establecimiento}</strong> ({caso.empresa})?
            Esta acción concluirá el proceso de evaluación y registrará el caso como <strong>Cerrado</strong> en el histórico institucional.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarCierre(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            disabled={cerrar.isPending}
            onClick={ejecutar}
          >
            {cerrar.isPending ? <CircularProgress size={16} color="inherit" /> : 'Confirmar cierre'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function SeccionExpedientesPendientes() {
  const { data: cerrables, isLoading } = useCasosCerrables();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isLoading) return <EstadoCarga />;
  if (cerrables.length === 0) {
    return <EstadoVacio titulo="No hay expedientes pendientes de cierre." icono={<TaskAltOutlinedIcon fontSize="large" />} />;
  }

  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {cerrables.map((c) => (
        <TarjetaCasoCerrable key={c.casoId} caso={c} />
      ))}
    </Box>
  ) : (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Empresa</TableCell>
            <TableCell>Establecimiento</TableCell>
            <TableCell>Acción</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cerrables.map((c) => (
            <FilaCasoCerrable key={c.casoId} caso={c} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function TarjetaExpedienteCerrado({
  expediente,
  onInspeccionar,
  onReabrir,
}: {
  expediente: Expediente;
  onInspeccionar: (casoId: string) => void;
  onReabrir: (exp: Expediente) => void;
}) {
  const esAprobada = expediente.resultadoFinal?.toLowerCase().includes('aprueba');

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {expediente.caso.establecimiento.nombre}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {expediente.caso.establecimiento.empresa?.razonSocial ?? '—'}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={expediente.resultadoFinal ?? 'No calculado'}
          color={esAprobada ? 'success' : 'default'}
          variant="outlined"
          sx={{ fontWeight: 600, maxWidth: '50%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
        />
      </Box>

      <Typography variant="caption" color="text.secondary">
        Cerrado el: <strong>{expediente.fechaCierre ? new Date(expediente.fechaCierre).toLocaleDateString() : '—'}</strong>
      </Typography>

      <Divider />

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<VisibilityOutlinedIcon />}
          onClick={() => onInspeccionar(expediente.caso.id)}
        >
          Inspeccionar
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<LockOpenOutlinedIcon />}
          onClick={() => onReabrir(expediente)}
        >
          Reabrir caso
        </Button>
      </Box>
    </Paper>
  );
}

function TablaExpedientesCerrados() {
  const { data: expedientes, isLoading, isError, error } = useExpedientes();
  const reabrir = useReabrirExpediente();
  const [casoAInspeccionar, setCasoAInspeccionar] = useState<string | null>(null);
  const [expedienteAReabrir, setExpedienteAReabrir] = useState<Expediente | null>(null);
  const [errorReabrir, setErrorReabrir] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  async function handleConfirmarReabrir() {
    if (!expedienteAReabrir) return;
    setErrorReabrir(null);
    try {
      await reabrir.mutateAsync(expedienteAReabrir.caso.id);
      setExpedienteAReabrir(null);
    } catch (err) {
      setErrorReabrir(err instanceof Error ? err.message : 'Error al reabrir el expediente');
    }
  }

  if (isLoading) return <EstadoCarga />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar los expedientes'}</Alert>;
  }
  if (!expedientes || expedientes.length === 0) {
    return <EstadoVacio titulo="No hay expedientes cerrados todavía." icono={<FolderOutlinedIcon fontSize="large" />} />;
  }

  return (
    <>
      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {expedientes.map((exp) => (
            <TarjetaExpedienteCerrado
              key={exp.id}
              expediente={exp}
              onInspeccionar={(id) => setCasoAInspeccionar(id)}
              onReabrir={(e) => {
                setErrorReabrir(null);
                setExpedienteAReabrir(e);
              }}
            />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Empresa</TableCell>
                <TableCell>Establecimiento</TableCell>
                <TableCell>Fecha de cierre</TableCell>
                <TableCell>Resultado final</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expedientes.map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell>{exp.caso.establecimiento.empresa?.razonSocial ?? '—'}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{exp.caso.establecimiento.nombre}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{exp.fechaCierre ? new Date(exp.fechaCierre).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={exp.resultadoFinal ?? 'No calculado'}
                      color={exp.resultadoFinal?.toLowerCase().includes('aprueba') ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<VisibilityOutlinedIcon />}
                        onClick={() => setCasoAInspeccionar(exp.caso.id)}
                      >
                        Inspeccionar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<LockOpenOutlinedIcon />}
                        onClick={() => {
                          setErrorReabrir(null);
                          setExpedienteAReabrir(exp);
                        }}
                      >
                        Reabrir caso
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ModalInspeccionCaso
        casoId={casoAInspeccionar}
        open={Boolean(casoAInspeccionar)}
        onClose={() => setCasoAInspeccionar(null)}
      />

      <Dialog open={Boolean(expedienteAReabrir)} onClose={() => setExpedienteAReabrir(null)}>
        <DialogTitle>Confirmar reapertura del caso</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas reabrir el caso del establecimiento <strong>{expedienteAReabrir?.caso.establecimiento.nombre}</strong> ({expedienteAReabrir?.caso.establecimiento.empresa?.razonSocial ?? 'Sin empresa'})?
            El expediente pasará a estado activo y la evaluación podrá ser consultada y gestionada nuevamente por el equipo técnico y de coordinación.
          </DialogContentText>
          {errorReabrir && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorReabrir}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpedienteAReabrir(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={reabrir.isPending}
            onClick={handleConfirmarReabrir}
          >
            {reabrir.isPending ? <CircularProgress size={16} color="inherit" /> : 'Confirmar reapertura'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function ResumenCoordinador() {
  const { data: casos } = useCasos();
  const { data: pendientes } = useInformesPendientes();
  const { data: devueltos } = useInformesDevueltos();
  const { data: cerrables } = useCasosCerrables();
  const { data: expedientes } = useExpedientes();

  const casosActivos = casos?.filter((c) => c.estado !== 'Cerrado').length ?? 0;
  const totalExpedientesCerrados = expedientes?.length ?? 0;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' },
        gap: 2,
      }}
    >
      <StatCard
        icono={<FolderOutlinedIcon />}
        valor={casosActivos}
        etiqueta="Casos activos"
        color="#2A6DB0"
      />
      <StatCard
        icono={<AssignmentTurnedInOutlinedIcon />}
        valor={pendientes.length}
        etiqueta="Informes por revisar"
        color="#0288D1"
      />
      <StatCard
        icono={<FactCheckOutlinedIcon />}
        valor={devueltos.length}
        etiqueta="Informes en corrección"
        color="#475569"
      />
      <StatCard
        icono={<TaskAltOutlinedIcon />}
        valor={cerrables.length}
        etiqueta="Expedientes por cerrar"
        color="#2E7D32"
      />
      <StatCard
        icono={<TaskAltOutlinedIcon />}
        valor={totalExpedientesCerrados}
        etiqueta="Expedientes cerrados"
        color="#546E7A"
      />
    </Box>
  );
}

export default function DashboardCoordinador() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        etiqueta="Coordinador"
        titulo="Panel de coordinador"
        icono={<FolderOutlinedIcon />}
      />


      <ResumenCoordinador />

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

      <Box>
        <Typography variant="h6" gutterBottom>
          Informes pendientes de revisión
        </Typography>
        <SeccionInformesPendientes />
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          Informes devueltos / en corrección
        </Typography>
        <SeccionInformesDevueltos />
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          Expedientes pendientes de cierre
        </Typography>
        <SeccionExpedientesPendientes />
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          Expedientes cerrados
        </Typography>
        <TablaExpedientesCerrados />
      </Box>
    </Box>
  );
}
