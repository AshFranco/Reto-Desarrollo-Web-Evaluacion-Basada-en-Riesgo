import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { useCalendario, type EvaluacionCalendario } from '@/lib/coordinador/useCalendario';
import {
  DIAS_CORTOS,
  claveDeFecha,
  diasDelRango,
  etiquetaDiaLarga,
  etiquetaPeriodo,
  hoyClave,
  mismoMes,
  mover,
  numeroDeDia,
  rangoVisible,
  type Vista,
} from '@/lib/calendario/fechas';
import { estaCancelada, infoEstado } from '@/lib/calendario/estados';
import { EstadoVacio } from '@/components/ui/EstadoVacio';

type Abrir = (ev: EvaluacionCalendario) => void;

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Etiqueta compacta de una evaluación dentro de una celda del mes. */
function EtiquetaEvaluacion({ ev, onAbrir }: { ev: EvaluacionCalendario; onAbrir: Abrir }) {
  const info = infoEstado(ev.idEstado);
  const cancelada = estaCancelada(ev.idEstado);
  return (
    <ButtonBase
      disabled={cancelada}
      onClick={(e) => {
        e.stopPropagation();
        onAbrir(ev);
      }}
      aria-label={`${ev.establecimiento.nombre}, ${info.etiqueta}`}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        mb: 0.5,
        px: 0.75,
        py: 0.25,
        borderRadius: '4px',
        borderLeft: `3px solid ${info.color}`,
        bgcolor: alpha(info.color, 0.12),
        color: 'text.primary',
        fontSize: '0.72rem',
        fontWeight: 600,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textDecoration: cancelada ? 'line-through' : 'none',
        opacity: cancelada ? 0.65 : 1,
        '&:hover': { bgcolor: alpha(info.color, 0.22) },
      }}
    >
      {ev.establecimiento.nombre}
    </ButtonBase>
  );
}

/** Tarjeta con el detalle de una evaluación (vistas de semana y de día). */
function TarjetaEvaluacion({ ev, onAbrir, conAccion }: { ev: EvaluacionCalendario; onAbrir: Abrir; conAccion?: boolean }) {
  const info = infoEstado(ev.idEstado);
  const cancelada = estaCancelada(ev.idEstado);
  // En la tarjeta compacta (columna angosta de la semana) el estado va debajo del nombre; con más ancho, a su lado.
  const apilado = !conAccion;
  const contenido = (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: apilado ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: apilado ? 0.5 : 1,
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{ textDecoration: cancelada ? 'line-through' : 'none', textAlign: 'left', wordBreak: 'break-word', minWidth: 0 }}
        >
          {ev.establecimiento.nombre}
        </Typography>
        <Chip
          size="small"
          label={info.etiqueta}
          sx={{
            bgcolor: alpha(info.color, 0.14),
            color: info.color,
            fontWeight: 700,
            flexShrink: 0,
            ...(apilado ? { height: 20, fontSize: '0.66rem', '& .MuiChip-label': { px: 0.75 } } : {}),
          }}
        />
      </Box>
      {ev.establecimiento.calle && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, textAlign: 'left' }}>
          <PlaceOutlinedIcon sx={{ fontSize: 14 }} />
          {ev.establecimiento.calle}
        </Typography>
      )}
    </>
  );

  if (conAccion) {
    return (
      <Paper variant="outlined" sx={{ p: 1.75, borderLeft: `4px solid ${info.color}`, opacity: cancelada ? 0.7 : 1 }}>
        {contenido}
        {!cancelada && (
          <Button size="small" variant="contained" sx={{ mt: 1.25 }} onClick={() => onAbrir(ev)}>
            Abrir evaluación
          </Button>
        )}
      </Paper>
    );
  }
  return (
    <ButtonBase
      disabled={cancelada}
      onClick={() => onAbrir(ev)}
      aria-label={`${ev.establecimiento.nombre}, ${info.etiqueta}`}
      sx={{
        display: 'block',
        width: '100%',
        p: 1,
        borderRadius: 1.5,
        borderLeft: `4px solid ${info.color}`,
        bgcolor: alpha(info.color, 0.08),
        opacity: cancelada ? 0.65 : 1,
        '&:hover': { bgcolor: alpha(info.color, 0.16) },
      }}
    >
      {contenido}
    </ButtonBase>
  );
}

function NumeroDeDia({ clave, esHoy, atenuado }: { clave: string; esHoy: boolean; atenuado?: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 24,
        height: 24,
        px: 0.5,
        borderRadius: 12,
        fontSize: '0.8rem',
        fontWeight: esHoy ? 700 : 500,
        bgcolor: esHoy ? 'primary.main' : 'transparent',
        color: esHoy ? 'primary.contrastText' : atenuado ? 'text.disabled' : 'text.primary',
      }}
    >
      {numeroDeDia(clave)}
    </Box>
  );
}

function VistaMes({
  dias,
  ancla,
  hoy,
  porDia,
  esMovil,
  onDia,
  onAbrir,
}: {
  dias: string[];
  ancla: string;
  hoy: string;
  porDia: Map<string, EvaluacionCalendario[]>;
  esMovil: boolean;
  onDia: (clave: string) => void;
  onAbrir: Abrir;
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', bgcolor: (t) => alpha(t.palette.primary.main, 0.05) }}>
        {DIAS_CORTOS.map((d) => (
          <Typography key={d} variant="caption" fontWeight={700} color="text.secondary" sx={{ py: 1, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {d}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {dias.map((clave) => {
          const eventos = porDia.get(clave) ?? [];
          const esHoy = clave === hoy;
          const dentro = mismoMes(clave, ancla);
          const visibles = eventos.slice(0, 3);
          const extra = eventos.length - visibles.length;
          return (
            <Box
              key={clave}
              data-dia={clave}
              aria-label={etiquetaDiaLarga(clave)}
              aria-current={esHoy ? 'date' : undefined}
              onClick={() => onDia(clave)}
              sx={{
                minHeight: esMovil ? 58 : 108,
                p: 0.75,
                cursor: 'pointer',
                borderTop: '1px solid',
                borderRight: '1px solid',
                borderColor: 'divider',
                bgcolor: dentro ? 'background.paper' : (t) => alpha(t.palette.text.primary, 0.03),
                '&:nth-of-type(7n)': { borderRight: 'none' },
                '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.05) },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: esMovil ? 'center' : 'flex-start', mb: 0.5 }}>
                <NumeroDeDia clave={clave} esHoy={esHoy} atenuado={!dentro} />
              </Box>
              {esMovil ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  {visibles.map((ev) => (
                    <Box key={ev.id} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: infoEstado(ev.idEstado).color }} />
                  ))}
                </Box>
              ) : (
                <>
                  {visibles.map((ev) => (
                    <EtiquetaEvaluacion key={ev.id} ev={ev} onAbrir={onAbrir} />
                  ))}
                  {extra > 0 && (
                    <ButtonBase
                      onClick={(e) => {
                        e.stopPropagation();
                        onDia(clave);
                      }}
                      sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'primary.main', px: 0.5 }}
                    >
                      +{extra} más
                    </ButtonBase>
                  )}
                </>
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

function VistaSemana({
  dias,
  hoy,
  porDia,
  esMovil,
  onDia,
  onAbrir,
}: {
  dias: string[];
  hoy: string;
  porDia: Map<string, EvaluacionCalendario[]>;
  esMovil: boolean;
  onDia: (clave: string) => void;
  onAbrir: Abrir;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : 'repeat(7, minmax(0, 1fr))', gap: 1.25 }}>
      {dias.map((clave, i) => {
        const eventos = porDia.get(clave) ?? [];
        const esHoy = clave === hoy;
        return (
          <Paper
            key={clave}
            variant="outlined"
            data-dia={clave}
            aria-current={esHoy ? 'date' : undefined}
            sx={{
              p: 1,
              minHeight: esMovil ? 0 : 200,
              borderColor: esHoy ? 'primary.main' : 'divider',
              borderWidth: esHoy ? 2 : 1,
              bgcolor: esHoy ? (t) => alpha(t.palette.primary.main, 0.04) : 'background.paper',
            }}
          >
            <ButtonBase onClick={() => onDia(clave)} aria-label={etiquetaDiaLarga(clave)} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, borderRadius: 1 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                {DIAS_CORTOS[i]}
              </Typography>
              <NumeroDeDia clave={clave} esHoy={esHoy} />
            </ButtonBase>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {eventos.length === 0 ? (
                <Typography variant="caption" color="text.disabled">
                  Sin evaluaciones
                </Typography>
              ) : (
                eventos.map((ev) => <TarjetaEvaluacion key={ev.id} ev={ev} onAbrir={onAbrir} />)
              )}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}

function VistaDia({ clave, hoy, eventos, onAbrir }: { clave: string; hoy: string; eventos: EvaluacionCalendario[]; onAbrir: Abrir }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6" component="h3" fontWeight={700}>
          {capitalizar(etiquetaDiaLarga(clave))}
        </Typography>
        {clave === hoy && <Chip size="small" color="primary" label="Hoy" />}
      </Box>
      {eventos.length === 0 ? (
        <EstadoVacio titulo="No tiene evaluaciones programadas para este día." icono={<EventAvailableOutlinedIcon />} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {eventos.map((ev) => (
            <TarjetaEvaluacion key={ev.id} ev={ev} onAbrir={onAbrir} conAccion />
          ))}
        </Box>
      )}
    </Paper>
  );
}

/**
 * Calendario del técnico evaluador (RF-11 / CU-11): vistas de día, semana y mes con las evaluaciones
 * programadas, su estado y un acceso directo a cada una. Los días son claves `YYYY-MM-DD` (ver lib/calendario/fechas).
 */
export function CalendarioEvaluador({ evaluadorId }: { evaluadorId: string }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down('md'));
  const [vista, setVista] = useState<Vista>('mes');
  const [ancla, setAncla] = useState(hoyClave);
  const hoy = hoyClave();

  // Siempre se pide el rango del mes: incluye cualquier semana o día de ese mes, así cambiar de vista no recarga.
  const rangoMes = useMemo(() => rangoVisible('mes', ancla), [ancla]);
  const { data, isLoading, isFetching, isError, refetch } = useCalendario(evaluadorId, rangoMes);
  // Mientras carga otro mes se siguen mostrando los datos anteriores en vez de un falso "sin evaluaciones".
  const ultimosDatos = useRef<EvaluacionCalendario[]>([]);
  if (data) ultimosDatos.current = data;
  const datos = data ?? ultimosDatos.current;

  const porDia = useMemo(() => {
    const mapa = new Map<string, EvaluacionCalendario[]>();
    for (const ev of datos) {
      if (!ev.fechaProgramada) continue;
      const clave = claveDeFecha(ev.fechaProgramada);
      mapa.set(clave, [...(mapa.get(clave) ?? []), ev]);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.establecimiento.nombre.localeCompare(b.establecimiento.nombre));
    return mapa;
  }, [datos]);

  const dias = useMemo(() => {
    const { desde, hasta } = rangoVisible(vista, ancla);
    return diasDelRango(desde, hasta);
  }, [vista, ancla]);
  const enPeriodo = useMemo(() => dias.flatMap((d) => porDia.get(d) ?? []), [dias, porDia]);
  const conteoPorEstado = useMemo(() => {
    const conteo = new Map<number | null, number>();
    for (const ev of enPeriodo) conteo.set(ev.idEstado, (conteo.get(ev.idEstado) ?? 0) + 1);
    return [...conteo.entries()].sort((a, b) => (a[0] ?? 99) - (b[0] ?? 99));
  }, [enPeriodo]);

  const abrir: Abrir = (ev) => navigate(`/tecnico/evaluaciones/${ev.id}`);
  const irADia = (clave: string) => {
    setAncla(clave);
    setVista('dia');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {isFetching && <LinearProgress sx={{ height: 3 }} />}
        <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <IconButton size="small" aria-label="Período anterior" onClick={() => setAncla(mover(vista, ancla, -1))}>
              <ChevronLeftIcon />
            </IconButton>
            <IconButton size="small" aria-label="Período siguiente" onClick={() => setAncla(mover(vista, ancla, 1))}>
              <ChevronRightIcon />
            </IconButton>
            <Button size="small" variant="outlined" onClick={() => setAncla(hoy)}>
              Hoy
            </Button>
            <Typography variant="h6" component="h2" fontWeight={700} sx={{ ml: 0.5 }}>
              {capitalizar(etiquetaPeriodo(vista, ancla))}
            </Typography>
          </Box>
          <ToggleButtonGroup exclusive size="small" color="primary" value={vista} onChange={(_, v: Vista | null) => v && setVista(v)} aria-label="Vista del calendario">
            <ToggleButton value="dia">Día</ToggleButton>
            <ToggleButton value="semana">Semana</ToggleButton>
            <ToggleButton value="mes">Mes</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
            {isLoading
              ? 'Cargando…'
              : enPeriodo.length === 0
                ? 'Sin evaluaciones en este período.'
                : `${enPeriodo.length} ${enPeriodo.length === 1 ? 'evaluación' : 'evaluaciones'} en este período:`}
          </Typography>
          {conteoPorEstado.map(([id, cantidad]) => {
            const info = infoEstado(id);
            return (
              <Chip
                key={id ?? 'sin-estado'}
                size="small"
                label={`${info.etiqueta} · ${cantidad}`}
                sx={{ bgcolor: alpha(info.color, 0.14), color: info.color, fontWeight: 700 }}
              />
            );
          })}
        </Box>
      </Paper>

      {isError && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch()}>Reintentar</Button>}>
          No se pudo cargar el calendario. Verifique su conexión e inténtelo de nuevo.
        </Alert>
      )}

      {vista === 'mes' && <VistaMes dias={dias} ancla={ancla} hoy={hoy} porDia={porDia} esMovil={esMovil} onDia={irADia} onAbrir={abrir} />}
      {vista === 'semana' && <VistaSemana dias={dias} hoy={hoy} porDia={porDia} esMovil={esMovil} onDia={irADia} onAbrir={abrir} />}
      {vista === 'dia' && <VistaDia clave={ancla} hoy={hoy} eventos={porDia.get(ancla) ?? []} onAbrir={abrir} />}
    </Box>
  );
}
