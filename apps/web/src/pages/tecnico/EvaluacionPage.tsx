import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Divider, LinearProgress,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useEvaluacionOffline } from '@/lib/tecnico/useEvaluacionOffline';
import { useSyncStatus } from '@/lib/sync/useSyncStatus';

const OPCIONES = ['C', 'CP', 'IT', 'N/A'] as const;
const ETIQUETAS: Record<string, string> = {
  C: 'Cumple',
  CP: 'Cumple parcial',
  IT: 'Incumple',
  'N/A': 'No aplica',
};

export default function EvaluacionPage() {
  const { asignacionId } = useParams<{ asignacionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const evaluacionServerId = searchParams.get('serverId') ?? asignacionId ?? '';
  const { enLinea, sincronizar } = useSyncStatus();

  const {
    items, respuestas, cargando, respondidos, evaluables, porcentajeAvance,
    responder, finalizar,
  } = useEvaluacionOffline({ asignacionId: asignacionId!, evaluacionServerId });

  const [confirmando, setConfirmando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  async function handleFinalizar() {
    setFinalizando(true);
    try {
      await finalizar();
      if (enLinea) await sincronizar();
      navigate('/tecnico');
    } finally {
      setFinalizando(false);
      setConfirmando(false);
    }
  }

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No hay catálogo disponible. Conéctate a internet y vuelve a iniciar sesión para descargarlo.
      </Alert>
    );
  }

  return (
    <Box sx={{ pb: 10 }}>
      {/* Cabecera sticky con progreso */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.paper', pb: 1, pt: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Ficha BPM — {respondidos}/{evaluables} criterios
          </Typography>
          {!enLinea && (
            <Tooltip title="Trabajando sin conexión — los datos se guardan localmente">
              <Chip icon={<WifiOffIcon />} label="Offline" size="small" color="warning" />
            </Tooltip>
          )}
        </Box>
        <LinearProgress
          variant="determinate"
          value={porcentajeAvance}
          sx={{ mx: 2, mt: 0.5, borderRadius: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
          {porcentajeAvance}% completado
        </Typography>
      </Box>

      {/* Ítems de la ficha */}
      <Box sx={{ px: 2, pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.map((item) => {
          const respuesta = respuestas.get(item.id);
          const respondido = !!respuesta;

          return (
            <Box key={item.id}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, pt: 0.5 }}>
                  {item.numeracion}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={respondido ? 400 : 500}>
                    {item.titulo}
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={respuesta?.codigoOpcion ?? null}
                    onChange={(_e, valor) => {
                      if (valor) void responder(item.id, valor, item.idCriticidad as 'C' | 'M' | 'Me' | null);
                    }}
                    sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}
                  >
                    {OPCIONES.map((op) => (
                      <ToggleButton
                        key={op}
                        value={op}
                        sx={{ fontSize: '0.7rem', py: 0.5, px: 1 }}
                      >
                        {op === 'N/A' ? 'N/A' : ETIQUETAS[op]}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              </Box>
              <Divider sx={{ mt: 2 }} />
            </Box>
          );
        })}
      </Box>

      {/* Botón finalizar flotante */}
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
        <Button
          variant="contained"
          fullWidth
          disabled={respondidos < evaluables || finalizando}
          onClick={() => setConfirmando(true)}
        >
          {respondidos < evaluables
            ? `Faltan ${evaluables - respondidos} criterios por responder`
            : 'Finalizar evaluación'}
        </Button>
      </Box>

      {/* Confirmación de cierre */}
      <Dialog open={confirmando} onClose={() => setConfirmando(false)}>
        <DialogTitle>Finalizar evaluación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se registrarán {respondidos} respuestas y se enviará la evaluación al servidor
            {enLinea ? ' inmediatamente.' : ' cuando recuperes conexión.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmando(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleFinalizar} disabled={finalizando}>
            {finalizando ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
