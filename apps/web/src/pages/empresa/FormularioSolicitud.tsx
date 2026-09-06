import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useSesion } from '@/lib/auth/useSesion';
import { useEmpresa } from '@/lib/empresa/useEmpresas';
import { useCrearSolicitud, useEnviarSolicitud } from '@/lib/empresa/useSolicitudes';

export default function FormularioSolicitud() {
  const navigate = useNavigate();
  const { sesion } = useSesion();
  const empresaId = sesion?.usuario.empresaId ?? null;
  const { data: empresa } = useEmpresa(empresaId);
  const establecimientos = empresa?.establecimientos ?? [];

  const crearSolicitud = useCrearSolicitud();
  const enviarSolicitud = useEnviarSolicitud();

  const [tipoEstablecimiento, setTipoEstablecimiento] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const enviando = crearSolicitud.isPending || enviarSolicitud.isPending;
  const camposBasicosCompletos = tipoEstablecimiento.trim() !== '' && motivo.trim() !== '';

  async function guardar(enviarDirecto: boolean) {
    setError(null);
    setExito(null);
    try {
      const solicitud = await crearSolicitud.mutateAsync({
        tipoEstablecimiento,
        motivo,
        observaciones: observaciones || undefined,
      });

      if (enviarDirecto) {
        await enviarSolicitud.mutateAsync({ id: solicitud.id, establecimientoId });
        setExito('Solicitud creada y enviada correctamente.');
      } else {
        setExito('Solicitud guardada como borrador.');
      }

      setTimeout(() => navigate('/empresa'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la solicitud');
    }
  }

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant="h4" gutterBottom>
        Nueva solicitud BPM
      </Typography>

      <Paper sx={{ padding: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {exito && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {exito}
          </Alert>
        )}

        <TextField
          label="Tipo de establecimiento"
          fullWidth
          required
          margin="normal"
          value={tipoEstablecimiento}
          onChange={(e) => setTipoEstablecimiento(e.target.value)}
          disabled={enviando}
        />
        <TextField
          label="Motivo"
          fullWidth
          required
          margin="normal"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          disabled={enviando}
        />
        <TextField
          label="Observaciones (opcional)"
          fullWidth
          multiline
          rows={3}
          margin="normal"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          disabled={enviando}
        />

        <Card variant="outlined" sx={{ mt: 2, mb: 2, padding: 2, backgroundColor: 'action.hover' }}>
          <Typography variant="subtitle2" gutterBottom>
            Establecimiento (necesario solo para enviar, no para guardar como borrador)
          </Typography>
          {establecimientos.length > 0 ? (
            <TextField
              select
              label="Establecimiento"
              fullWidth
              value={establecimientoId}
              onChange={(e) => setEstablecimientoId(e.target.value)}
              disabled={enviando}
            >
              {establecimientos.map((est) => (
                <MenuItem key={est.id} value={est.id}>
                  {est.nombre}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Gestión de establecimientos: pendiente, no implementado en el backend todavía. Tu
              empresa no tiene ningún establecimiento registrado, así que por ahora solo podés
              guardar la solicitud como borrador — enviarla directamente no está disponible
              hasta que exista esa función.
            </Typography>
          )}
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            disabled={enviando || !camposBasicosCompletos}
            onClick={() => guardar(false)}
          >
            {enviando ? <CircularProgress size={24} /> : 'Guardar borrador'}
          </Button>
          <Button
            variant="contained"
            fullWidth
            disabled={enviando || !camposBasicosCompletos || !establecimientoId}
            onClick={() => guardar(true)}
          >
            {enviando ? <CircularProgress size={24} /> : 'Enviar directamente'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
