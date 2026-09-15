import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import WifiOffOutlinedIcon from '@mui/icons-material/WifiOffOutlined';
import { Collapse } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useFichaVigente } from '@/lib/tecnico/useFichaVigente';
import {
  useEvaluacionDetalle,
  useIniciarEvaluacion,
  useResponderItem,
  useFinalizarEvaluacion,
  useReabrirEvaluacion,
  type RespuestaItemInput,
} from '@/lib/tecnico/useEvaluacion';
import { useSubirEvidencia, useEliminarEvidencia } from '@/lib/tecnico/useEvidencias';

import { useCatalogoMotorRiesgo, useCalcularRiesgo, type SeleccionFactor } from '@/lib/tecnico/useCalcularRiesgo';
import { useSyncStatus } from '@/lib/sync/useSyncStatus';
import { useSincronizacionEvaluacion } from '@/lib/tecnico/useSincronizacionEvaluacion';
import { enqueue } from '@/lib/sync/queue';
import { db } from '@/lib/db';
import type { EvaluacionDetalle, Evidencia, NodoCatalogo, OpcionRespuestaLocal, ResultadoRiesgo, AsignacionMia } from '@/lib/types';
import { EstadoCarga } from '@/components/ui/EstadoCarga';

/**
 * No hay endpoint que exponga el catálogo de nivel_criticidad — estos
 * códigos vienen de prisma/seed.ts (C=Crítica, M=Mayor, Me=Menor), no de
 * una respuesta en vivo. Por eso tampoco se puede pre-cargar la
 * criticidad de una respuesta ya guardada (el backend solo devuelve el id
 * numérico, sin catálogo para resolverlo) — si el técnico vuelve a elegir
 * CP o IT en un ítem ya respondido, tiene que elegir la criticidad de nuevo.
 */
const NIVELES_CRITICIDAD: { codigo: 'C' | 'M' | 'Me'; nombre: string }[] = [
  { codigo: 'C', nombre: 'Crítica' },
  { codigo: 'M', nombre: 'Mayor' },
  { codigo: 'Me', nombre: 'Menor' },
];

/** No hay campo `nombre` en opcion_respuesta (confirmado en vivo) — las etiquetas son solo de presentación. */
const ETIQUETA_OPCION: Record<string, string> = {
  C: 'Cumple',
  CP: 'Cumplimiento parcial',
  IT: 'Incumple totalmente',
  'N/A': 'No aplica',
};

/** Colores tipo "pill" para las opciones de respuesta, siguiendo el sistema de colores de estado (verde/ámbar/rojo/neutro). */
const ESTILO_OPCION_NEUTRO = { color: '#37474F', fondo: '#ECEFF1', borde: '#CFD8DC' };
const ESTILO_OPCION: Record<string, { color: string; fondo: string; borde: string }> = {
  C: { color: '#1B5E20', fondo: '#E6F4EA', borde: '#A5D6A7' },
  CP: { color: '#8A5300', fondo: '#FDF1DC', borde: '#F0C36D' },
  IT: { color: '#B71C1C', fondo: '#FCEAEA', borde: '#EF9A9A' },
  'N/A': ESTILO_OPCION_NEUTRO,
};

function obtenerEstiloOpcion(codigo: string) {
  return ESTILO_OPCION[codigo] ?? ESTILO_OPCION_NEUTRO;
}

/** Confirmado en vivo (.env ALLOWED_FILE_MIME_TYPES) — el servidor valida por magic bytes igual, esto es solo un filtro de UX. */
const TIPOS_ACEPTADOS = 'image/jpeg,image/png,image/webp,application/pdf,video/mp4';

function aplanarEvaluables(nodos: NodoCatalogo[]): NodoCatalogo[] {
  return nodos.flatMap((n) => [...(n.esEvaluable ? [n] : []), ...aplanarEvaluables(n.hijos)]);
}

function tipoDeArchivo(archivo: File): 'FOTO' | 'VIDEO' | 'DOCUMENTO' {
  if (archivo.type.startsWith('image/')) return 'FOTO';
  if (archivo.type.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENTO';
}

/**
 * Adjuntar evidencia offline (guardar el archivo y encolar POST /evidencias
 * como multipart) queda fuera de esta pasada -- solo se conectaron a la
 * cola INICIAR_EVALUACION, RESPUESTAS y FINALIZAR_EVALUACION, que es lo que
 * pidieron. Sin conexión, el botón se deshabilita con un aviso en vez de
 * intentar la subida y fallar.
 */
function SubirEvidencia({
  evaluacionId,
  respuestaItemId,
  etiqueta,
  enLinea,
  evidencias = [],
  bloqueada = false,
}: {
  evaluacionId: string;
  respuestaItemId?: string;
  etiqueta: string;
  enLinea: boolean;
  evidencias?: Evidencia[];
  bloqueada?: boolean;
}) {
  const subir = useSubirEvidencia();
  const eliminar = useEliminarEvidencia();
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function manejarArchivos(e: ChangeEvent<HTMLInputElement>) {
    const archivos = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (archivos.length === 0) return;
    setError(null);
    try {
      for (const archivo of archivos) {
        await subir.mutateAsync({
          evaluacionId,
          archivo,
          tipo: tipoDeArchivo(archivo),
          respuestaItemId,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
    }
  }

  async function handleEliminar(evidenciaId: string) {
    setError(null);
    setEliminandoId(evidenciaId);
    try {
      await eliminar.mutateAsync({ evidenciaId, evaluacionId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la evidencia');
    } finally {
      setEliminandoId(null);
    }
  }

  if (!enLinea) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Sin conexión: adjuntar evidencia no está disponible ahora mismo.
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      {!bloqueada && (
        <Button size="small" variant="text" component="label" disabled={subir.isPending}>
          {subir.isPending ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
          {etiqueta}
          <input type="file" hidden accept={TIPOS_ACEPTADOS} multiple onChange={manejarArchivos} />
        </Button>
      )}

      {evidencias.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {evidencias.map((ev) => (
            <Box
              key={ev.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'action.hover',
                borderRadius: 1,
                px: 1.5,
                py: 0.5,
                fontSize: '0.8125rem',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                <AttachFileIcon fontSize="small" color="action" />
                <Typography
                  variant="body2"
                  sx={{
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    maxWidth: { xs: 180, sm: 320, md: 480 },
                  }}
                  title={ev.nombreArchivo}
                >
                  {ev.nombreArchivo.includes('-') && ev.nombreArchivo.length > 30 && !ev.nombreArchivo.includes('.')
                    ? `Archivo adjunto (#${ev.id.slice(-4)})`
                    : ev.nombreArchivo}
                </Typography>
                {ev.tamanoBytes && (
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    ({Math.round(Number(ev.tamanoBytes) / 1024)} KB)
                  </Typography>
                )}
              </Box>
              {!bloqueada && (
                <IconButton
                  size="small"
                  color="error"
                  aria-label="Eliminar evidencia"
                  disabled={eliminandoId === ev.id || eliminar.isPending}
                  onClick={() => handleEliminar(ev.id)}
                >
                  {eliminandoId === ev.id ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <DeleteOutlineIcon fontSize="small" />
                  )}
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
      )}

      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

interface DraftRespuesta {
  codigoOpcion: RespuestaItemInput['codigoOpcion'] | '';
  nivelCriticidad: RespuestaItemInput['nivelCriticidad'] | '';
  observacion: string;
}

function FilaCriterio({
  criterio,
  evaluacionId,
  opciones,
  draftInicial,
  pendienteSyncInicial,
  respuestaItemId,
  enLinea,
  onGuardadoOffline,
  evidencias = [],
  bloqueada = false,
}: {
  criterio: NodoCatalogo;
  evaluacionId: string;
  opciones: OpcionRespuestaLocal[];
  draftInicial: DraftRespuesta;
  pendienteSyncInicial: boolean;
  respuestaItemId?: string;
  enLinea: boolean;
  onGuardadoOffline: () => void;
  evidencias?: Evidencia[];
  bloqueada?: boolean;
}) {
  const responder = useResponderItem();
  const [draft, setDraft] = useState<DraftRespuesta>(draftInicial);
  const [guardado, setGuardado] = useState(false);
  const [guardadoLocal, setGuardadoLocal] = useState(pendienteSyncInicial);
  const [error, setError] = useState<string | null>(null);

  const requiereCriticidad = draft.codigoOpcion === 'CP' || draft.codigoOpcion === 'IT';
  // C y N/A no requieren criticidad — se pueden auto-guardar al seleccionar.
  const puedeAutoGuardar = (codigo: string) => codigo === 'C' || codigo === 'N/A';

  async function guardarConDraft(draftActualizado: DraftRespuesta) {
    setError(null);
    setGuardado(false);
    setGuardadoLocal(false);
    if (!draftActualizado.codigoOpcion) {
      setError('Elige una opción de respuesta.');
      return;
    }
    const requiereCrit = draftActualizado.codigoOpcion === 'CP' || draftActualizado.codigoOpcion === 'IT';
    if (requiereCrit && !draftActualizado.nivelCriticidad) {
      setError('Este hallazgo necesita un nivel de criticidad.');
      return;
    }

    const respuesta: RespuestaItemInput = {
      itemId: criterio.id,
      codigoOpcion: draftActualizado.codigoOpcion,
      nivelCriticidad: requiereCrit ? (draftActualizado.nivelCriticidad as 'C' | 'M' | 'Me') : undefined,
      observacion: draftActualizado.observacion.trim() || undefined,
    };

    if (!enLinea) {
      await enqueue('RESPUESTAS', { evaluacionServerId: evaluacionId, respuestas: [respuesta] });
      setGuardadoLocal(true);
      onGuardadoOffline();
      return;
    }

    try {
      await responder.mutateAsync({ evaluacionId, ...respuesta });
      setGuardado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la respuesta');
    }
  }

  async function guardar() {
    await guardarConDraft(draft);
  }

  // Chip de estado visual: refleja si este criterio ya fue evaluado o está pendiente.
  const estaEvaluado = guardado || guardadoLocal || !!respuestaItemId;
  const ChipEstado = estaEvaluado ? (
    <Chip
      size="small"
      icon={<CheckCircleOutlineIcon fontSize="small" />}
      label={draft.codigoOpcion ? (ETIQUETA_OPCION[draft.codigoOpcion] ?? draft.codigoOpcion) : 'Evaluado'}
      color={
        draft.codigoOpcion === 'C' ? 'success'
          : draft.codigoOpcion === 'N/A' ? 'default'
          : 'warning'
      }
      variant="outlined"
      sx={{ ml: 1 }}
    />
  ) : (
    <Chip
      size="small"
      icon={<RadioButtonUncheckedIcon fontSize="small" />}
      label="Pendiente"
      color="info"
      variant="outlined"
      sx={{ ml: 1 }}
    />
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        padding: 2,
        mb: 1.5,
        borderColor: estaEvaluado ? 'success.light' : 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
        <Typography variant="body2">
          <strong>{criterio.numeracion}</strong> {criterio.titulo}
        </Typography>
        {!bloqueada && ChipEstado}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Respuesta
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={draft.codigoOpcion || null}
            onChange={(_e, valor: string | null) => {
              if (!valor) return;
              setGuardado(false);
              setGuardadoLocal(false);
              const nuevoDraft: DraftRespuesta = { ...draft, codigoOpcion: valor as DraftRespuesta['codigoOpcion'] };
              setDraft(nuevoDraft);
              // Auto-guardado para opciones que no requieren criticidad adicional.
              if (!bloqueada && puedeAutoGuardar(valor)) {
                void guardarConDraft(nuevoDraft);
              }
            }}
            disabled={responder.isPending || bloqueada}
            sx={{
              gap: 1,
              flexWrap: 'wrap',
              '& .MuiToggleButtonGroup-grouped': {
                border: '1px solid !important',
                borderRadius: '999px !important',
                margin: '0 !important',
              },
            }}
          >
            {opciones.map((o) => {
              const estilo = obtenerEstiloOpcion(o.codigo);
              return (
                <ToggleButton
                  key={o.id}
                  value={o.codigo}
                  sx={{
                    borderRadius: '999px !important',
                    border: '1px solid',
                    borderColor: estilo.borde,
                    color: 'text.secondary',
                    fontWeight: 600,
                    textTransform: 'none',
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: estilo.fondo,
                      color: estilo.color,
                      '&:hover': { backgroundColor: estilo.fondo },
                    },
                    '&:hover': { backgroundColor: estilo.fondo },
                  }}
                >
                  {ETIQUETA_OPCION[o.codigo] ?? o.codigo}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Box>

        {requiereCriticidad && (
          <TextField
            select
            label="Nivel de criticidad"
            size="small"
            sx={{ minWidth: 160 }}
            value={draft.nivelCriticidad}
            onChange={(e) => {
              setGuardado(false);
              setGuardadoLocal(false);
              setDraft((d) => ({ ...d, nivelCriticidad: e.target.value as DraftRespuesta['nivelCriticidad'] }));
            }}
            disabled={responder.isPending || bloqueada}
          >
            {NIVELES_CRITICIDAD.map((n) => (
              <MenuItem key={n.codigo} value={n.codigo}>
                {n.nombre}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          label="Observaciones"
          size="small"
          sx={{ flex: 1, minWidth: 220 }}
          value={draft.observacion}
          onChange={(e) => {
            setGuardado(false);
            setGuardadoLocal(false);
            setDraft((d) => ({ ...d, observacion: e.target.value }));
          }}
          disabled={responder.isPending || bloqueada}
        />

        {!bloqueada && (requiereCriticidad || draft.observacion) && (
          <Button variant="outlined" size="small" disabled={responder.isPending} onClick={guardar}>
            {responder.isPending ? <CircularProgress size={18} /> : 'Guardar'}
          </Button>
        )}
      </Box>
      {guardado && (
        <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
          ✓ Guardado.
        </Typography>
      )}
      {guardadoLocal && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
          Guardado localmente — pendiente de sincronizar.
        </Typography>
      )}
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          {error}
        </Typography>
      )}

      {respuestaItemId ? (
        <SubirEvidencia
          evaluacionId={evaluacionId}
          respuestaItemId={respuestaItemId}
          etiqueta="Adjuntar evidencia a este criterio"
          enLinea={enLinea}
          evidencias={evidencias}
          bloqueada={bloqueada}
        />
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Guarda una respuesta primero para poder adjuntar evidencia.
        </Typography>
      )}
    </Paper>
  );
}


function SeleccionFactores({
  evaluacionId,
  onCalculado,
}: {
  evaluacionId: string;
  onCalculado: (resultado: ResultadoRiesgo) => void;
}) {
  const { data: catalogo, isLoading, isError } = useCatalogoMotorRiesgo();
  const calcular = useCalcularRiesgo();
  const [selecciones, setSelecciones] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const factoresManuales = useMemo(() => (catalogo?.factores ?? []).filter((f) => !f.esAutomatico), [catalogo]);

  async function handleCalcular() {
    setError(null);
    const faltante = factoresManuales.find((f) => !selecciones[f.id]);
    if (faltante) {
      setError(`Falta elegir una opción para "${faltante.nombre}".`);
      return;
    }
    const seleccionesFactores: SeleccionFactor[] = factoresManuales.map((f) => ({
      factorId: f.id,
      opcionId: selecciones[f.id] as string,
    }));
    try {
      const resultado = await calcular.mutateAsync({ evaluacionId, seleccionesFactores });
      onCalculado(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular el riesgo');
    }
  }

  if (isLoading) return <EstadoCarga etiqueta="Calculando el resultado…" />;
  if (isError) return <Alert severity="error">Error al cargar los factores de riesgo.</Alert>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Antes de ver el resultado, elige la opción que corresponde a este establecimiento en cada factor de riesgo.
      </Typography>
      {factoresManuales.map((f) => (
        <TextField
          key={f.id}
          select
          label={f.nombre}
          size="small"
          value={selecciones[f.id] ?? ''}
          onChange={(e) => setSelecciones((s) => ({ ...s, [f.id]: e.target.value }))}
          disabled={calcular.isPending}
        >
          {f.opciones.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.descripcion}
            </MenuItem>
          ))}
        </TextField>
      ))}
      {error && <Alert severity="error">{error}</Alert>}
      <Box>
        <Button variant="contained" disabled={calcular.isPending} onClick={handleCalcular}>
          {calcular.isPending ? <CircularProgress size={20} /> : 'Calcular riesgo'}
        </Button>
      </Box>
    </Box>
  );
}

function ResumenResultado({ resultado, catalogoNivel }: { resultado: ResultadoRiesgo; catalogoNivel: string | null }) {
  return (
    <Paper variant="outlined" sx={{ padding: 3 }}>
      <Typography variant="h6" gutterBottom>
        Resultado del cálculo de riesgo
      </Typography>
      <Alert severity={resultado.aprueba ? 'success' : 'error'} sx={{ mb: 2 }}>
        {resultado.calificacionTexto ?? (resultado.aprueba ? 'Aprueba la inspección' : 'No aprueba la inspección')}
      </Alert>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">% Cumplimiento</Typography>
          <Typography variant="h6">{resultado.porcentajeCumplimiento ?? '—'}%</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">RE (Riesgo Establecimiento)</Typography>
          <Typography variant="h6">{resultado.reValor ?? '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">RP (Riesgo Producto)</Typography>
          <Typography variant="h6">{resultado.rpValor ?? '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">RT (Riesgo Total)</Typography>
          <Typography variant="h6">{resultado.rtValor ?? '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Nivel de riesgo</Typography>
          <Typography variant="h6">{catalogoNivel ?? '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Frecuencia próxima inspección</Typography>
          <Typography variant="h6">{resultado.frecuencia ?? '—'}</Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2" color="text.secondary">
        NC críticas: {resultado.ncCriticas} · NC mayores: {resultado.ncMayores} · NC menores: {resultado.ncMenores}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {resultado.otorgaPermisoSanitario ? 'Otorga permiso sanitario.' : 'No otorga permiso sanitario.'}
      </Typography>
      {resultado.fechaProximaInspeccion && (
        <Typography variant="body2" color="text.secondary">
          Próxima inspección: {new Date(resultado.fechaProximaInspeccion).toLocaleDateString()}
        </Typography>
      )}
    </Paper>
  );
}

function CardAntecedentesEstablecimiento({ establecimiento }: { establecimiento: any }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlinedIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2">
            Antecedentes del establecimiento: <strong>{establecimiento.nombre}</strong>
          </Typography>
        </Box>
        <Button size="small" variant="text" onClick={() => setExpandido(!expandido)}>
          {expandido ? 'Ocultar antecedentes' : 'Ver antecedentes e historial'}
        </Button>
      </Box>

      <Collapse in={expandido} unmountOnExit sx={{ mt: 1.5 }}>
        <Divider sx={{ mb: 1.5 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Empresa / RNC</Typography>
            <Typography variant="body2">{establecimiento.empresa?.razonSocial ?? '—'} (RNC: {establecimiento.empresa?.rnc ?? establecimiento.rnc ?? '—'})</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Dirección</Typography>
            <Typography variant="body2">{establecimiento.calle || 'No indicada'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Producción Anual Declarada</Typography>
            <Typography variant="body2">{establecimiento.produccionAnual ? `${Number(establecimiento.produccionAnual).toLocaleString()} unidades/año` : 'No declarada'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Permiso Sanitario</Typography>
            <Typography variant="body2">{establecimiento.numeroPermisoSanitario || 'Sin permiso registrado'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Historial de Rechazos Sanitarios</Typography>
            <Typography variant="body2" color="success.main" fontWeight={500}>
              Sin rechazos microbiológicos previos en sistema
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Personal Registrado</Typography>
            <Typography variant="body2">
              {Number(establecimiento.empleadosMasculino ?? 0) + Number(establecimiento.empleadosFemenino ?? 0)} empleados
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}

function SeccionResultadoRiesgo({
  evaluacion,
  onReabrir,
  reabriendo,
  errorReabrir,
  onVerFicha,
}: {
  evaluacion: EvaluacionDetalle;
  onReabrir: () => void;
  reabriendo: boolean;
  errorReabrir: string | null;
  onVerFicha: () => void;
}) {
  const navigate = useNavigate();
  const { data: catalogo } = useCatalogoMotorRiesgo();
  const [resultado, setResultado] = useState<ResultadoRiesgo | null>(evaluacion.calculoRiesgo ?? null);

  useEffect(() => {
    if (evaluacion.calculoRiesgo) {
      setResultado(evaluacion.calculoRiesgo);
    }
  }, [evaluacion.calculoRiesgo]);

  const casoCerrado = evaluacion.caso?.estado === 'Cerrado' || evaluacion.estado.codigo === 'CERRADA';

  const nivelTexto = useMemo(() => {
    if (!resultado || !catalogo) return null;
    // idNivelRiesgo no trae su código legible — se deriva cruzando la
    // frecuencia devuelta contra el catálogo (frecuencia y nivelRiesgo son 1:1 por rango).
    return catalogo.rangosFrecuencia.find((r) => r.frecuencia === resultado.frecuencia)?.nivelRiesgo ?? null;
  }, [resultado, catalogo]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
          borderColor: 'primary.light',
        }}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            {casoCerrado ? 'Caso cerrado — Modo inspección' : 'Evaluación finalizada'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {casoCerrado
              ? 'Este caso se encuentra formalmente cerrado en el archivo institucional. Los datos se muestran en modo de solo lectura para inspección y auditoría.'
              : 'Los criterios están bloqueados. Si necesitas corregir respuestas antes del cierre final, puedes reabrirla.'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<VisibilityOutlinedIcon />}
            onClick={onVerFicha}
          >
            Ver respuestas de la ficha
          </Button>
          <Tooltip
            title={
              casoCerrado
                ? 'Este caso está cerrado. Para editarlo, un coordinador debe reabrir el caso desde el apartado de expedientes cerrados.'
                : ''
            }
          >
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={reabriendo ? <CircularProgress size={16} color="inherit" /> : <EditOutlinedIcon />}
                disabled={reabriendo || casoCerrado}
                onClick={onReabrir}
              >
                {reabriendo ? 'Reabriendo...' : 'Reabrir evaluación para edición'}
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/tecnico')}
          >
            Volver al panel
          </Button>
        </Box>
      </Paper>
      {errorReabrir && <Alert severity="error">{errorReabrir}</Alert>}

      {resultado ? (
        <ResumenResultado resultado={resultado} catalogoNivel={nivelTexto} />
      ) : casoCerrado || evaluacion.estado.codigo !== 'FINALIZADA' ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {casoCerrado ? 'Expediente de evaluación cerrado' : 'Evaluación en modo solo lectura'}
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            {casoCerrado
              ? 'Este caso se encuentra cerrado en el archivo institucional. La evaluación se muestra en modo solo lectura para fines de consulta y auditoría. No se permite realizar recálculos en este estado.'
              : `Esta evaluación se encuentra en estado ${evaluacion.estado.nombre}. Para modificar respuestas o volver a calcular el resultado de riesgo, primero debe ser reabierta para edición.`}
          </Alert>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ padding: 3 }}>
          <Typography variant="h6" gutterBottom>
            Calcular resultado de riesgo
          </Typography>
          <SeleccionFactores evaluacionId={evaluacion.id} onCalculado={setResultado} />
        </Paper>
      )}
    </Box>
  );
}


export default function EjecutarEvaluacion() {
  const navigate = useNavigate();
  const { evaluacionId } = useParams<{ evaluacionId: string }>();
  const { data: ficha, isLoading: cargandoFicha, isError: errorFicha } = useFichaVigente();
  const { data: evaluacion, isLoading: cargandoEvaluacion, isError: errorEvaluacion } = useEvaluacionDetalle(evaluacionId);
  const iniciar = useIniciarEvaluacion();
  const finalizar = useFinalizarEvaluacion();
  const reabrir = useReabrirEvaluacion();
  const sync = useSyncStatus();
  const sincronizacion = useSincronizacionEvaluacion(evaluacionId);
  const queryClient = useQueryClient();
  const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);
  const [errorReabrir, setErrorReabrir] = useState<string | null>(null);
  const [finalizadoLocal, setFinalizadoLocal] = useState(false);
  const [inicioIntentado, setInicioIntentado] = useState(false);
  const [verFichaEnBloqueada, setVerFichaEnBloqueada] = useState(false);

  const casoCerrado = evaluacion?.caso?.estado === 'Cerrado' || evaluacion?.estado.codigo === 'CERRADA';

  // 1. Cuando la evaluación en el servidor ya está bloqueada/finalizada, limpiar finalizadoLocal
  useEffect(() => {
    if (evaluacion?.bloqueada && finalizadoLocal) {
      setFinalizadoLocal(false);
    }
  }, [evaluacion?.bloqueada, finalizadoLocal]);

  // 2. Escuchar evento de sincronización de processor.ts para refrescar el detalle automáticamente
  useEffect(() => {
    function handleSyncActualizado() {
      void sincronizacion.refrescar();
      if (evaluacionId) {
        queryClient.invalidateQueries({ queryKey: ['evaluaciones', evaluacionId] });
        queryClient.invalidateQueries({ queryKey: ['asignaciones', 'mias'] });
      }
    }
    window.addEventListener('sync:actualizado', handleSyncActualizado);
    return () => window.removeEventListener('sync:actualizado', handleSyncActualizado);
  }, [sincronizacion, queryClient, evaluacionId]);

  // 3. Cuando se detecta red y hay una finalización local pendiente
  useEffect(() => {
    if (sync.enLinea && finalizadoLocal) {
      void sincronizacion.refrescar();
      if (evaluacionId) {
        queryClient.invalidateQueries({ queryKey: ['evaluaciones', evaluacionId] });
      }
    }
  }, [sync.enLinea, finalizadoLocal, sincronizacion, queryClient, evaluacionId]);

  async function handleReabrir() {
    if (!evaluacionId) return;
    if (casoCerrado) {
      setErrorReabrir('Este caso está cerrado. Para editarlo, un coordinador debe reabrir el caso desde expedientes cerrados.');
      return;
    }
    setErrorReabrir(null);
    try {
      await reabrir.mutateAsync(evaluacionId);
      setFinalizadoLocal(false);
      setVerFichaEnBloqueada(false);
    } catch (err) {
      setErrorReabrir(err instanceof Error ? err.message : 'Error al reabrir la evaluación');
    }
  }

  const criterios = useMemo(() => (ficha ? aplanarEvaluables(ficha.secciones) : []), [ficha]);
  const secciones = ficha?.secciones ?? [];
  const criteriosPorSeccion = useMemo(
    () => secciones.map((s) => aplanarEvaluables([s])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ficha]
  );
  const [seccionActiva, setSeccionActiva] = useState(0);
  const [soloPendientes, setSoloPendientes] = useState(false);

  // Si la evaluación todavía está PROGRAMADA (nunca se inició), lo hace acá
  // -- online, llamando al servidor directo; sin conexión, encolando
  // INICIAR_EVALUACION en vez de fallar. Evita el bug del intento anterior
  // (PR #11), que nunca encolaba esto y dejaba fechaInicio en null para
  // siempre. Se intenta una sola vez por visita a la pantalla.
  useEffect(() => {
    if (!evaluacion || evaluacion.bloqueada || inicioIntentado) return;
    if (evaluacion.estado.codigo !== 'PROGRAMADA') return;
    setInicioIntentado(true);
    if (sync.enLinea) {
      iniciar.mutate(evaluacion.id);
    } else {
      void enqueue('INICIAR_EVALUACION', {
        evaluacionServerId: evaluacion.id,
        fechaInicio: new Date().toISOString(),
      }).then(async () => {
        try {
          await db.asignacion.toCollection().modify((a) => {
            if (a.evaluacionId === evaluacion.id) {
              a.evaluacionEstado = 'EN_CURSO';
            }
          });
        } catch {}
        queryClient.setQueryData<AsignacionMia[]>(['asignaciones', 'mias'], (prev) =>
          prev?.map((a) => (a.evaluacionId === evaluacion.id ? { ...a, evaluacionEstado: 'EN_CURSO' } : a))
        );
        void sincronizacion.refrescar();
      });
    }
  }, [evaluacion, inicioIntentado, sync.enLinea, iniciar, sincronizacion, queryClient]);

  // Mapa itemId -> DraftRespuesta para que cada fila pueda arrancar con lo
  // que ya hay guardado en el servidor (o en la cola local, si estamos offline).
  const respuestaPorItem = useMemo(() => {
    const mapa = new Map<string, DraftRespuesta>();
    if (!evaluacion || !ficha) return mapa;
    const opcionPorId = new Map(ficha.opcionesRespuesta.map((o) => [o.id, o.codigo]));
    for (const r of evaluacion.respuestas) {
      mapa.set(r.idItemFicha, {
        codigoOpcion: (opcionPorId.get(r.idOpcionRespuesta) as DraftRespuesta['codigoOpcion']) ?? '',
        nivelCriticidad: '',
        observacion: r.observacion ?? '',
      });
    }
    for (const [itemId, payload] of sincronizacion.respuestasEncoladasPorItem) {
      mapa.set(itemId, {
        codigoOpcion: (payload.codigoOpcion as DraftRespuesta['codigoOpcion']) ?? '',
        nivelCriticidad: (payload.nivelCriticidad as DraftRespuesta['nivelCriticidad']) ?? '',
        observacion: payload.observacion ?? '',
      });
    }
    return mapa;
  }, [evaluacion, ficha, sincronizacion.respuestasEncoladasPorItem]);

  const respuestaItemIdPorItem = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const r of evaluacion?.respuestas ?? []) {
      mapa.set(r.idItemFicha, r.id);
    }
    return mapa;
  }, [evaluacion?.respuestas]);

  const evidenciasPorItem = useMemo(() => {
    const mapa = new Map<string, Evidencia[]>();
    for (const ev of evaluacion?.evidencias ?? []) {
      if (!ev.idRespuestaItem) continue;
      const arr = mapa.get(ev.idRespuestaItem) ?? [];
      arr.push(ev);
      mapa.set(ev.idRespuestaItem, arr);
    }
    return mapa;
  }, [evaluacion?.evidencias]);

  const evidenciasGenerales = useMemo(
    () => (evaluacion?.evidencias ?? []).filter((e) => !e.idRespuestaItem),
    [evaluacion?.evidencias]
  );

  const idsRespondidos = useMemo(() => {
    const ids = new Set<string>();
    for (const r of evaluacion?.respuestas ?? []) ids.add(r.idItemFicha);
    for (const id of sincronizacion.respuestasEncoladasPorItem.keys()) ids.add(id);
    return ids;
  }, [evaluacion?.respuestas, sincronizacion.respuestasEncoladasPorItem]);

  async function handleFinalizar() {
    if (!evaluacionId) return;
    setErrorFinalizar(null);
    if (!sync.enLinea) {
      await enqueue('FINALIZAR_EVALUACION', { evaluacionServerId: evaluacionId, observacionesFinales: undefined });
      setFinalizadoLocal(true);
      try {
        await db.asignacion.toCollection().modify((a) => {
          if (a.evaluacionId === evaluacionId) {
            a.evaluacionEstado = 'FINALIZADA';
          }
        });
      } catch {}
      queryClient.setQueryData<AsignacionMia[]>(['asignaciones', 'mias'], (prev) =>
        prev?.map((a) => (a.evaluacionId === evaluacionId ? { ...a, evaluacionEstado: 'FINALIZADA' } : a))
      );
      await sincronizacion.refrescar();
      return;
    }
    try {
      await finalizar.mutateAsync(evaluacionId);
    } catch (err) {
      setErrorFinalizar(err instanceof Error ? err.message : 'Error al finalizar la evaluación');
    }
  }

  if (cargandoFicha || cargandoEvaluacion) return <EstadoCarga etiqueta="Cargando la evaluación…" />;
  if (errorFicha) return <Alert severity="error">Error al cargar la ficha vigente.</Alert>;
  if (errorEvaluacion || !evaluacion) {
    const mensajeError =
      errorEvaluacion && typeof errorEvaluacion === 'object'
        ? String((errorEvaluacion as { message?: unknown }).message ?? 'Error al cargar la evaluación.')
        : 'No se pudo obtener la información de la evaluación desde el servidor.';

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          textAlign: 'center',
          maxWidth: 600,
          mx: 'auto',
          mt: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <WifiOffOutlinedIcon color="warning" sx={{ fontSize: 56 }} />
        <Typography variant="h6" fontWeight={600}>
          {!sync.enLinea ? 'Conéctate a internet para realizar esta acción' : 'Error al cargar la evaluación'}
        </Typography>
        <Alert severity={!sync.enLinea ? 'info' : 'error'} sx={{ width: '100%', textAlign: 'left' }}>
          {!sync.enLinea
            ? 'No fue posible cargar esta evaluación porque tu dispositivo se encuentra sin conexión a internet y este expediente no está guardado en la memoria local.'
            : mensajeError}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Button variant="contained" color="primary" startIcon={<ArrowBackIcon />} onClick={() => navigate('/tecnico')}>
            Volver al panel
          </Button>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </Box>
      </Paper>
    );
  }

  const totalRespondidas = idsRespondidos.size;
  const totalEvaluables = evaluacion.versionFicha.totalItemsEvaluables;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h4">Ficha BPM — {evaluacion.establecimiento.nombre}</Typography>
            {casoCerrado && <Chip size="small" color="default" label="Caso Cerrado" variant="outlined" sx={{ fontWeight: 600 }} />}
            {!sync.enLinea && <Chip size="small" color="warning" label="Sin conexión" />}
          </Box>
          <Typography color="text.secondary">
            {evaluacion.establecimiento.empresa?.razonSocial} · Versión {evaluacion.versionFicha.numeroVersion}
          </Typography>
        </Box>
      </Box>

      <CardAntecedentesEstablecimiento establecimiento={evaluacion.establecimiento} />

      {(sincronizacion.pendientes.length > 0 || sync.sincronizando) && (
        <Alert severity="info">
          {sync.sincronizando
            ? 'Sincronizando...'
            : `${sincronizacion.pendientes.length} cambio(s) de esta evaluación guardado(s) localmente, pendiente(s) de sincronizar.`}
        </Alert>
      )}

      {sincronizacion.errores.length > 0 && (
        <Alert severity="error">
          {sincronizacion.errores.length} cambio(s) no se pudieron enviar al servidor después de varios intentos y
          quedaron sin sincronizar. Revisa la conexión y avisa a soporte si el problema persiste:
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            {sincronizacion.errores.map((op) => (
              <li key={op.uuidLocal}>
                {op.tipo}: {op.errorMsg ?? 'error desconocido'}
              </li>
            ))}
          </Box>
        </Alert>
      )}

      {!evaluacion.bloqueada && !finalizadoLocal && (
        <Alert severity="info">
          {totalRespondidas}/{totalEvaluables} criterios respondidos. Para finalizar hay que responder todos.
        </Alert>
      )}

      {finalizadoLocal ? (
        <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight={600}>
              Evaluación finalizada localmente
            </Typography>
          </Box>
          <Alert severity="warning">
            Las respuestas de los {totalEvaluables} criterios han sido completadas y registradas en este dispositivo. La evaluación se enviará automáticamente al servidor en cuanto se detecte conexión a internet.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {sync.enLinea
              ? 'Conexión detectada. Sincronizando con el servidor en segundo plano...'
              : 'Tu dispositivo se encuentra sin conexión a internet. Puedes regresar al panel de asignaciones o revisar las respuestas registradas.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 1 }}>
            <Button
              variant="outlined"
              startIcon={<VisibilityOutlinedIcon />}
              onClick={() => setVerFichaEnBloqueada(true)}
            >
              Ver respuestas registradas
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/tecnico')}
            >
              Volver al panel
            </Button>
            {sync.enLinea && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  void sincronizacion.refrescar();
                  if (evaluacionId) {
                    queryClient.invalidateQueries({ queryKey: ['evaluaciones', evaluacionId] });
                  }
                }}
              >
                Sincronizar ahora
              </Button>
            )}
          </Box>
        </Paper>
      ) : evaluacion.bloqueada && !verFichaEnBloqueada ? (
        <SeccionResultadoRiesgo
          evaluacion={evaluacion}
          onReabrir={handleReabrir}
          reabriendo={reabrir.isPending}
          errorReabrir={errorReabrir}
          onVerFicha={() => setVerFichaEnBloqueada(true)}
        />
      ) : (
        <>
          {evaluacion.bloqueada && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1.5,
                borderColor: 'primary.light',
                bgcolor: 'background.default',
              }}
            >
              <Box>
                <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                  Visualizando Ficha BPM ({casoCerrado ? 'Caso Cerrado — Solo lectura' : 'Modo solo lectura'})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {casoCerrado
                    ? 'Este caso se encuentra formalmente cerrado. Puedes revisar todas las respuestas y evidencias registradas en modo solo lectura.'
                    : 'Esta evaluación se encuentra finalizada. Puedes revisar todas las respuestas y evidencias registradas.'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentOutlinedIcon />}
                  onClick={() => setVerFichaEnBloqueada(false)}
                >
                  {evaluacion.calculoRiesgo ? 'Volver al resultado de riesgo' : 'Volver al resumen'}
                </Button>
                <Tooltip
                  title={
                    casoCerrado
                      ? 'Este caso está cerrado. Para editarlo, un coordinador debe reabrir el caso desde el apartado de expedientes cerrados.'
                      : ''
                  }
                >
                  <span>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={reabrir.isPending ? <CircularProgress size={16} color="inherit" /> : <EditOutlinedIcon />}
                      disabled={reabrir.isPending || casoCerrado}
                      onClick={handleReabrir}
                    >
                      {reabrir.isPending ? 'Reabriendo...' : 'Reabrir evaluación para edición'}
                    </Button>
                  </span>
                </Tooltip>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/tecnico')}
                >
                  Volver al panel
                </Button>
              </Box>
            </Paper>
          )}
          {/* ── Navegador de Secciones ── */}
          {secciones.length > 1 && (() => {
            const respondidosPorSeccion = criteriosPorSeccion.map(
              (crs) => crs.filter((c) => idsRespondidos.has(c.id)).length
            );
            const seccionActual = secciones[seccionActiva];
            const totalSeccion = criteriosPorSeccion[seccionActiva]?.length ?? 0;
            const respondidosSeccion = respondidosPorSeccion[seccionActiva] ?? 0;
            const progresoSeccion = totalSeccion > 0 ? Math.round((respondidosSeccion / totalSeccion) * 100) : 0;

            return (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {/* Selector de sección */}
                  <Select
                    size="small"
                    value={seccionActiva}
                    onChange={(e) => setSeccionActiva(Number(e.target.value))}
                    sx={{ minWidth: 260, flex: 1 }}
                  >
                    {secciones.map((s, i) => {
                      const resp = respondidosPorSeccion[i] ?? 0;
                      const total = criteriosPorSeccion[i]?.length ?? 0;
                      return (
                        <MenuItem key={s.id} value={i}>
                          {s.titulo} ({resp}/{total})
                        </MenuItem>
                      );
                    })}
                  </Select>
                  {/* Botones Anterior / Siguiente */}
                  <Tooltip title="Sección anterior">
                    <span>
                      <IconButton
                        size="small"
                        disabled={seccionActiva === 0}
                        onClick={() => setSeccionActiva((a) => a - 1)}
                      >
                        <ArrowBackIosNewIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Siguiente sección">
                    <span>
                      <IconButton
                        size="small"
                        disabled={seccionActiva >= secciones.length - 1}
                        onClick={() => setSeccionActiva((a) => a + 1)}
                      >
                        <ArrowForwardIosIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>

                {/* Barra de progreso de la sección actual */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progresoSeccion}
                    sx={{ flex: 1, height: 6, borderRadius: 3 }}
                    color={progresoSeccion === 100 ? 'success' : 'primary'}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {respondidosSeccion}/{totalSeccion} ({progresoSeccion}%)
                  </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Sección {seccionActiva + 1} de {secciones.length}: <strong>{seccionActual?.titulo}</strong>
                </Typography>
              </Paper>
            );
          })()}

          {/* ── Filtro solo pendientes + saltar al siguiente pendiente ── */}
          {!evaluacion.bloqueada && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={soloPendientes}
                    onChange={(e) => setSoloPendientes(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    Mostrar solo pendientes
                  </Typography>
                }
              />
              {(() => {
                // Encuentra el siguiente criterio pendiente a partir del actual mostrado
                const todosLaSeccion = criteriosPorSeccion[seccionActiva] ?? criterios;
                const idxSiguiente = todosLaSeccion.findIndex((c) => !idsRespondidos.has(c.id));
                if (idxSiguiente === -1) return null;
                const siguienteCriterio = todosLaSeccion[idxSiguiente];
                if (!siguienteCriterio) return null;
                return (
                  <Button
                    size="small"
                    variant="outlined"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => {
                      const el = document.getElementById(`criterio-${siguienteCriterio.id}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    Ir al siguiente pendiente
                  </Button>
                );
              })()}
            </Box>
          )}

          {/* ── Criterios de la sección activa (con filtro opcional) ── */}
          {(criteriosPorSeccion[seccionActiva] ?? criterios)
            .filter((c) => !soloPendientes || !idsRespondidos.has(c.id))
            .map((criterio) => {
              const respuestaItemId = respuestaItemIdPorItem.get(criterio.id);
              const evidenciasItem = respuestaItemId ? evidenciasPorItem.get(String(respuestaItemId)) ?? [] : [];
              return (
                <div id={`criterio-${criterio.id}`} key={criterio.id}>
                  <FilaCriterio
                    criterio={criterio}
                    evaluacionId={evaluacion.id}
                    opciones={ficha?.opcionesRespuesta ?? []}
                    draftInicial={
                      respuestaPorItem.get(criterio.id) ?? { codigoOpcion: '', nivelCriticidad: '', observacion: '' }
                    }
                    pendienteSyncInicial={sincronizacion.respuestasEncoladasPorItem.has(criterio.id)}
                    respuestaItemId={respuestaItemId}
                    enLinea={sync.enLinea}
                    onGuardadoOffline={() => void sincronizacion.refrescar()}
                    evidencias={evidenciasItem}
                    bloqueada={evaluacion.bloqueada}
                  />
                </div>
              );
            })}

          {soloPendientes && (criteriosPorSeccion[seccionActiva] ?? criterios).filter((c) => !idsRespondidos.has(c.id)).length === 0 && (
            <Alert severity="success">
              ¡Todos los criterios de esta sección han sido evaluados!
            </Alert>
          )}

          <Paper variant="outlined" sx={{ padding: 2 }}>
            <Typography variant="body2" gutterBottom>
              Evidencia general de la evaluación (no ligada a un criterio puntual)
            </Typography>
            <SubirEvidencia
              evaluacionId={evaluacion.id}
              etiqueta="Adjuntar evidencia general"
              enLinea={sync.enLinea}
              evidencias={evidenciasGenerales}
              bloqueada={evaluacion.bloqueada}
            />
          </Paper>

          {!evaluacion.bloqueada && (
            <Box>
              {errorFinalizar && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorFinalizar}
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  disabled={finalizar.isPending || totalRespondidas < totalEvaluables}
                  onClick={handleFinalizar}
                >
                  {finalizar.isPending ? <CircularProgress size={20} /> : 'Finalizar evaluación'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/tecnico')}
                >
                  Guardar y salir al panel
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
