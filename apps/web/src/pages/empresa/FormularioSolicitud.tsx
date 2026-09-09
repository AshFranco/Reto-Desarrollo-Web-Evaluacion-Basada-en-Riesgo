import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  MenuItem,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useSesion } from '@/lib/auth/useSesion';
import { useEmpresa } from '@/lib/empresa/useEmpresas';
import { useCrearSolicitud, useEnviarSolicitud } from '@/lib/empresa/useSolicitudes';
import { PageHeader } from '@/components/ui/PageHeader';

const PASOS = ['Datos básicos', 'Establecimiento', 'Confirmar'];

export default function FormularioSolicitud() {
  const navigate = useNavigate();
  const { sesion } = useSesion();
  const empresaId = sesion?.usuario.empresaId ?? null;
  const { data: empresa } = useEmpresa(empresaId);
  const establecimientos = empresa?.establecimientos ?? [];

  const crearSolicitud = useCrearSolicitud();
  const enviarSolicitud = useEnviarSolicitud();

  const [paso, setPaso] = useState(0);
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
    <Box sx={{ maxWidth: 640 }}>
      <PageHeader etiqueta="Empresa" titulo="Nueva solicitud BPM" icono={<DescriptionOutlinedIcon />} />

      <Paper variant="outlined" sx={{ padding: { xs: 2.5, md: 4 }, mt: 3 }}>
        <Stepper activeStep={paso} sx={{ mb: 4 }}>
          {PASOS.map((etiqueta) => (
            <Step key={etiqueta}>
              <StepLabel>{etiqueta}</StepLabel>
            </Step>
          ))}
        </Stepper>

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

        {paso === 0 && (
          <Box>
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
          </Box>
        )}

        {paso === 1 && (
          <Card variant="outlined" sx={{ padding: 2.5, backgroundColor: 'action.hover' }}>
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
                Tu empresa todavía no tiene ningún establecimiento registrado, así que por ahora
                solo podés guardar la solicitud como borrador — enviarla directamente necesita
                elegir un establecimiento.{' '}
                <RouterLink to="/empresa/establecimientos/nuevo">Registrar uno ahora</RouterLink>.
              </Typography>
            )}
          </Card>
        )}

        {paso === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Revisá los datos antes de guardar.
            </Typography>
            <Typography variant="body2">
              <strong>Tipo de establecimiento:</strong> {tipoEstablecimiento || '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Motivo:</strong> {motivo || '—'}
            </Typography>
            {observaciones && (
              <Typography variant="body2">
                <strong>Observaciones:</strong> {observaciones}
              </Typography>
            )}
            <Typography variant="body2">
              <strong>Establecimiento:</strong>{' '}
              {establecimientos.find((e) => e.id === establecimientoId)?.nombre ?? 'No seleccionado'}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 4 }}>
          <Button disabled={paso === 0 || enviando} onClick={() => setPaso((p) => p - 1)}>
            Atrás
          </Button>

          {paso < PASOS.length - 1 ? (
            <Button
              variant="contained"
              disabled={paso === 0 && !camposBasicosCompletos}
              onClick={() => setPaso((p) => p + 1)}
            >
              Siguiente
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                disabled={enviando || !camposBasicosCompletos}
                onClick={() => guardar(false)}
              >
                {enviando ? <CircularProgress size={20} /> : 'Guardar borrador'}
              </Button>
              <Button
                variant="contained"
                disabled={enviando || !camposBasicosCompletos || !establecimientoId}
                onClick={() => guardar(true)}
              >
                {enviando ? <CircularProgress size={20} /> : 'Enviar directamente'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
