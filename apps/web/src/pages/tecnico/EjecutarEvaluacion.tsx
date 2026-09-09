import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Step,
  StepButton,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useFichaVigente } from '@/lib/tecnico/useFichaVigente';
import {
  useEvaluacionDetalle,
  useIniciarEvaluacion,
  useResponderItem,
  useFinalizarEvaluacion,
  type RespuestaItemInput,
} from '@/lib/tecnico/useEvaluacion';
import { useSubirEvidencia } from '@/lib/tecnico/useEvidencias';
import { useCatalogoMotorRiesgo, useCalcularRiesgo, type SeleccionFactor } from '@/lib/tecnico/useCalcularRiesgo';
import { useSyncStatus } from '@/lib/sync/useSyncStatus';
import { useSincronizacionEvaluacion } from '@/lib/tecnico/useSincronizacionEvaluacion';
import { enqueue } from '@/lib/sync/queue';
import type { NodoCatalogo, OpcionRespuestaLocal, ResultadoRiesgo } from '@/lib/types';
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
}: {
  evaluacionId: string;
  respuestaItemId?: string;
  etiqueta: string;
  enLinea: boolean;
}) {
  const subir = useSubirEvidencia();
  const [subidas, setSubidas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function manejarArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError(null);
    try {
      const evidencia = await subir.mutateAsync({
        evaluacionId,
        archivo,
        tipo: tipoDeArchivo(archivo),
        respuestaItemId,
      });
      setSubidas((s) => [...s, evidencia.nombreArchivo]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
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
      <Button size="small" variant="text" component="label" disabled={subir.isPending}>
        {subir.isPending ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
        {etiqueta}
        <input type="file" hidden accept={TIPOS_ACEPTADOS} onChange={manejarArchivo} />
      </Button>
      {subidas.length > 0 && (
        <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
          {subidas.length} archivo(s) adjuntado(s) en esta sesión.
        </Typography>
      )}
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block' }}>
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
}: {
  criterio: NodoCatalogo;
  evaluacionId: string;
  opciones: OpcionRespuestaLocal[];
  draftInicial: DraftRespuesta;
  pendienteSyncInicial: boolean;
  respuestaItemId?: string;
  enLinea: boolean;
  onGuardadoOffline: () => void;
}) {
  const responder = useResponderItem();
  const [draft, setDraft] = useState<DraftRespuesta>(draftInicial);
  const [guardado, setGuardado] = useState(false);
  const [guardadoLocal, setGuardadoLocal] = useState(pendienteSyncInicial);
  const [error, setError] = useState<string | null>(null);

  const requiereCriticidad = draft.codigoOpcion === 'CP' || draft.codigoOpcion === 'IT';

  async function guardar() {
    setError(null);
    setGuardado(false);
    setGuardadoLocal(false);
    if (!draft.codigoOpcion) {
      setError('Elegí una opción de respuesta.');
      return;
    }
    if (requiereCriticidad && !draft.nivelCriticidad) {
      setError('Este hallazgo necesita un nivel de criticidad.');
      return;
    }

    const respuesta: RespuestaItemInput = {
      itemId: criterio.id,
      codigoOpcion: draft.codigoOpcion,
      nivelCriticidad: requiereCriticidad ? (draft.nivelCriticidad as 'C' | 'M' | 'Me') : undefined,
      observacion: draft.observacion.trim() || undefined,
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

  return (
    <Paper variant="outlined" sx={{ padding: 2, mb: 1.5 }}>
      <Typography variant="body2" gutterBottom>
        <strong>{criterio.numeracion}</strong> {criterio.titulo}
      </Typography>
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
              setDraft((d) => ({ ...d, codigoOpcion: valor as DraftRespuesta['codigoOpcion'] }));
            }}
            disabled={responder.isPending}
            sx={{ gap: 1, flexWrap: 'wrap' }}
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
            disabled={responder.isPending}
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
          disabled={responder.isPending}
        />

        <Button variant="outlined" size="small" disabled={responder.isPending} onClick={guardar}>
          {responder.isPending ? <CircularProgress size={18} /> : 'Guardar'}
        </Button>
      </Box>
      {guardado && (
        <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
          Guardado.
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
        />
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Guardá una respuesta primero para poder adjuntarle evidencia.
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
        Antes de ver el resultado, elegí la opción que corresponde a este establecimiento en cada factor de riesgo.
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

function SeccionResultadoRiesgo({ evaluacionId }: { evaluacionId: string }) {
  const { data: catalogo } = useCatalogoMotorRiesgo();
  const [resultado, setResultado] = useState<ResultadoRiesgo | null>(null);

  const nivelTexto = useMemo(() => {
    if (!resultado || !catalogo) return null;
    // idNivelRiesgo no trae su código legible — se deriva cruzando la
    // frecuencia devuelta contra el catálogo (frecuencia y nivelRiesgo son 1:1 por rango).
    return catalogo.rangosFrecuencia.find((r) => r.frecuencia === resultado.frecuencia)?.nivelRiesgo ?? null;
  }, [resultado, catalogo]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="warning">Esta evaluación ya fue finalizada — no se puede editar la ficha.</Alert>
      {resultado ? (
        <ResumenResultado resultado={resultado} catalogoNivel={nivelTexto} />
      ) : (
        <Paper variant="outlined" sx={{ padding: 3 }}>
          <Typography variant="h6" gutterBottom>
            Calcular resultado de riesgo
          </Typography>
          <SeleccionFactores evaluacionId={evaluacionId} onCalculado={setResultado} />
        </Paper>
      )}
    </Box>
  );
}

export default function EjecutarEvaluacion() {
  const { evaluacionId } = useParams<{ evaluacionId: string }>();
  const { data: ficha, isLoading: cargandoFicha, isError: errorFicha } = useFichaVigente();
  const { data: evaluacion, isLoading: cargandoEvaluacion, isError: errorEvaluacion } = useEvaluacionDetalle(evaluacionId);
  const iniciar = useIniciarEvaluacion();
  const finalizar = useFinalizarEvaluacion();
  const sync = useSyncStatus();
  const sincronizacion = useSincronizacionEvaluacion(evaluacionId);
  const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);
  const [finalizadoLocal, setFinalizadoLocal] = useState(false);
  const [inicioIntentado, setInicioIntentado] = useState(false);

  const criterios = useMemo(() => (ficha ? aplanarEvaluables(ficha.secciones) : []), [ficha]);
  const secciones = ficha?.secciones ?? [];
  const criteriosPorSeccion = useMemo(
    () => secciones.map((s) => aplanarEvaluables([s])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ficha]
  );
  const [seccionActiva, setSeccionActiva] = useState(0);

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
      void enqueue('INICIAR_EVALUACION', { evaluacionServerId: evaluacion.id }).then(() => sincronizacion.refrescar());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluacion?.id, evaluacion?.estado.codigo, evaluacion?.bloqueada, sync.enLinea, inicioIntentado]);

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
    // Las respuestas encoladas localmente son más recientes que lo que ya
    // confirmó el servidor -- pisan lo anterior si hay ambas.
    for (const [itemId, r] of sincronizacion.respuestasEncoladasPorItem) {
      mapa.set(itemId, {
        codigoOpcion: r.codigoOpcion,
        nivelCriticidad: r.nivelCriticidad ?? '',
        observacion: r.observacion ?? '',
      });
    }
    return mapa;
  }, [evaluacion, ficha, sincronizacion.respuestasEncoladasPorItem]);

  const respuestaItemIdPorItem = useMemo(() => {
    const mapa = new Map<string, string>();
    if (!evaluacion) return mapa;
    for (const r of evaluacion.respuestas) mapa.set(r.idItemFicha, r.id);
    return mapa;
  }, [evaluacion]);

  // Cuenta como respondido tanto lo que ya confirmó el servidor como lo que
  // quedó encolado localmente sin sincronizar todavía -- para que el
  // progreso y "Finalizar" reflejen la realidad aunque no haya conexión.
  const idsRespondidos = useMemo(() => {
    const ids = new Set(evaluacion?.respuestas.map((r) => r.idItemFicha) ?? []);
    for (const itemId of sincronizacion.respuestasEncoladasPorItem.keys()) ids.add(itemId);
    return ids;
  }, [evaluacion, sincronizacion.respuestasEncoladasPorItem]);

  async function handleFinalizar() {
    if (!evaluacionId) return;
    setErrorFinalizar(null);
    if (!sync.enLinea) {
      await enqueue('FINALIZAR_EVALUACION', { evaluacionServerId: evaluacionId, observacionesFinales: undefined });
      setFinalizadoLocal(true);
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
  if (errorEvaluacion || !evaluacion) return <Alert severity="error">Error al cargar la evaluación.</Alert>;

  const totalRespondidas = idsRespondidos.size;
  const totalEvaluables = evaluacion.versionFicha.totalItemsEvaluables;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h4">Ficha BPM — {evaluacion.establecimiento.nombre}</Typography>
        {!sync.enLinea && <Chip size="small" color="warning" label="Sin conexión" />}
      </Box>
      <Typography color="text.secondary">
        {evaluacion.establecimiento.empresa?.razonSocial} · Versión {evaluacion.versionFicha.numeroVersion}
      </Typography>

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
          quedaron sin sincronizar. Revisá la conexión y avisá a soporte si el problema sigue:
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
        <Alert severity="warning">
          Evaluación finalizada localmente — se enviará al servidor cuando haya conexión. El resultado del cálculo
          de riesgo se podrá ver una vez que se sincronice.
        </Alert>
      ) : evaluacion.bloqueada ? (
        <SeccionResultadoRiesgo evaluacionId={evaluacion.id} />
      ) : (
        <>
          {secciones.length > 1 && (
            <Stepper nonLinear activeStep={seccionActiva} sx={{ mb: 1, flexWrap: 'wrap', rowGap: 2 }}>
              {secciones.map((s, indice) => (
                <Step key={s.id} completed={false}>
                  <StepButton onClick={() => setSeccionActiva(indice)}>{s.titulo}</StepButton>
                </Step>
              ))}
            </Stepper>
          )}

          {(criteriosPorSeccion[seccionActiva] ?? criterios).map((criterio) => (
            <FilaCriterio
              key={criterio.id}
              criterio={criterio}
              evaluacionId={evaluacion.id}
              opciones={ficha?.opcionesRespuesta ?? []}
              draftInicial={
                respuestaPorItem.get(criterio.id) ?? { codigoOpcion: '', nivelCriticidad: '', observacion: '' }
              }
              pendienteSyncInicial={sincronizacion.respuestasEncoladasPorItem.has(criterio.id)}
              respuestaItemId={respuestaItemIdPorItem.get(criterio.id)}
              enLinea={sync.enLinea}
              onGuardadoOffline={() => void sincronizacion.refrescar()}
            />
          ))}

          <Paper variant="outlined" sx={{ padding: 2 }}>
            <Typography variant="body2" gutterBottom>
              Evidencia general de la evaluación (no ligada a un criterio puntual)
            </Typography>
            <SubirEvidencia
              evaluacionId={evaluacion.id}
              etiqueta="Adjuntar evidencia general"
              enLinea={sync.enLinea}
            />
          </Paper>

          <Box>
            {errorFinalizar && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorFinalizar}
              </Alert>
            )}
            <Button
              variant="contained"
              disabled={finalizar.isPending || totalRespondidas < totalEvaluables}
              onClick={handleFinalizar}
            >
              {finalizar.isPending ? <CircularProgress size={20} /> : 'Finalizar evaluación'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
