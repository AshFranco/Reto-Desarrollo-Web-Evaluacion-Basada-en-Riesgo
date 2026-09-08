import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useFichaVigente } from '@/lib/tecnico/useFichaVigente';
import {
  useEvaluacionDetalle,
  useResponderItem,
  useFinalizarEvaluacion,
  type RespuestaItemInput,
} from '@/lib/tecnico/useEvaluacion';
import type { NodoCatalogo, OpcionRespuestaLocal } from '@/lib/types';

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

function aplanarEvaluables(nodos: NodoCatalogo[]): NodoCatalogo[] {
  return nodos.flatMap((n) => [...(n.esEvaluable ? [n] : []), ...aplanarEvaluables(n.hijos)]);
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
}: {
  criterio: NodoCatalogo;
  evaluacionId: string;
  opciones: OpcionRespuestaLocal[];
  draftInicial: DraftRespuesta;
}) {
  const responder = useResponderItem();
  const [draft, setDraft] = useState<DraftRespuesta>(draftInicial);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiereCriticidad = draft.codigoOpcion === 'CP' || draft.codigoOpcion === 'IT';

  async function guardar() {
    setError(null);
    setGuardado(false);
    if (!draft.codigoOpcion) {
      setError('Elegí una opción de respuesta.');
      return;
    }
    if (requiereCriticidad && !draft.nivelCriticidad) {
      setError('Este hallazgo necesita un nivel de criticidad.');
      return;
    }
    try {
      await responder.mutateAsync({
        evaluacionId,
        itemId: criterio.id,
        codigoOpcion: draft.codigoOpcion,
        nivelCriticidad: requiereCriticidad ? (draft.nivelCriticidad as 'C' | 'M' | 'Me') : undefined,
        observacion: draft.observacion.trim() || undefined,
      });
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
        <TextField
          select
          label="Respuesta"
          size="small"
          sx={{ minWidth: 200 }}
          value={draft.codigoOpcion}
          onChange={(e) => {
            setGuardado(false);
            setDraft((d) => ({ ...d, codigoOpcion: e.target.value as DraftRespuesta['codigoOpcion'] }));
          }}
          disabled={responder.isPending}
        >
          {opciones.map((o) => (
            <MenuItem key={o.id} value={o.codigo}>
              {ETIQUETA_OPCION[o.codigo] ?? o.codigo}
            </MenuItem>
          ))}
        </TextField>

        {requiereCriticidad && (
          <TextField
            select
            label="Nivel de criticidad"
            size="small"
            sx={{ minWidth: 160 }}
            value={draft.nivelCriticidad}
            onChange={(e) => {
              setGuardado(false);
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
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          {error}
        </Typography>
      )}
    </Paper>
  );
}

export default function EjecutarEvaluacion() {
  const { evaluacionId } = useParams<{ evaluacionId: string }>();
  const navigate = useNavigate();
  const { data: ficha, isLoading: cargandoFicha, isError: errorFicha } = useFichaVigente();
  const { data: evaluacion, isLoading: cargandoEvaluacion, isError: errorEvaluacion } = useEvaluacionDetalle(evaluacionId);
  const finalizar = useFinalizarEvaluacion();
  const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);

  const criterios = useMemo(() => (ficha ? aplanarEvaluables(ficha.secciones) : []), [ficha]);

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
    return mapa;
  }, [evaluacion, ficha]);

  async function handleFinalizar() {
    if (!evaluacionId) return;
    setErrorFinalizar(null);
    try {
      await finalizar.mutateAsync(evaluacionId);
      navigate('/tecnico');
    } catch (err) {
      setErrorFinalizar(err instanceof Error ? err.message : 'Error al finalizar la evaluación');
    }
  }

  if (cargandoFicha || cargandoEvaluacion) return <CircularProgress />;
  if (errorFicha) return <Alert severity="error">Error al cargar la ficha vigente.</Alert>;
  if (errorEvaluacion || !evaluacion) return <Alert severity="error">Error al cargar la evaluación.</Alert>;

  const totalRespondidas = evaluacion.respuestas.length;
  const totalEvaluables = evaluacion.versionFicha.totalItemsEvaluables;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h4">Ficha BPM — {evaluacion.establecimiento.nombre}</Typography>
      <Typography color="text.secondary">
        {evaluacion.establecimiento.empresa?.razonSocial} · Versión {evaluacion.versionFicha.numeroVersion}
      </Typography>

      <Alert severity="info">
        {totalRespondidas}/{totalEvaluables} criterios respondidos. Para finalizar hay que responder todos.
      </Alert>

      {evaluacion.bloqueada ? (
        <Alert severity="warning">Esta evaluación ya fue finalizada — no se puede editar.</Alert>
      ) : (
        <>
          {criterios.map((criterio) => (
            <FilaCriterio
              key={criterio.id}
              criterio={criterio}
              evaluacionId={evaluacion.id}
              opciones={ficha?.opcionesRespuesta ?? []}
              draftInicial={
                respuestaPorItem.get(criterio.id) ?? { codigoOpcion: '', nivelCriticidad: '', observacion: '' }
              }
            />
          ))}

          <Box>
            {errorFinalizar && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorFinalizar}
              </Alert>
            )}
            <Button variant="contained" disabled={finalizar.isPending} onClick={handleFinalizar}>
              {finalizar.isPending ? <CircularProgress size={20} /> : 'Finalizar evaluación'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
