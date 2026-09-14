import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSesion } from '@/lib/auth/useSesion';

import { useEmpresa } from '@/lib/empresa/useEmpresas';
import { useCrearSolicitud, useEnviarSolicitud } from '@/lib/empresa/useSolicitudes';
import { PageHeader } from '@/components/ui/PageHeader';

interface TipoEstablecimientoCatalogo {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

const TIPOS_ESTABLECIMIENTO_DEFAULT: string[] = [
  'Planta Procesadora / Fabricación de Alimentos',
  'Empacadora y Envasadora de Alimentos',
  'Almacén y Centro de Distribución',
  'Distribuidora Mayorista de Alimentos',
  'Frigorífico / Almacenamiento en Frío',
  'Planta de Tratamiento y Envasado de Agua',
  'Cocina Central / Catering Industrial',
  'Panificadora y Repostería Industrial',
];

const PASOS = ['Datos básicos', 'Establecimiento', 'Confirmar'];

export default function FormularioSolicitud() {
  const navigate = useNavigate();
  const { sesion } = useSesion();
  const empresaId = sesion?.usuario.empresaId ?? null;
  const { data: empresa } = useEmpresa(empresaId);
  const establecimientos = empresa?.establecimientos ?? [];

  const crearSolicitud = useCrearSolicitud();
  const enviarSolicitud = useEnviarSolicitud();

  const { data: tiposApi } = useQuery({
    queryKey: ['tipos-establecimiento'],
    queryFn: () => apiFetchJson<TipoEstablecimientoCatalogo[]>('/api/v1/catalogos/tipos-establecimiento'),
  });

  const opcionesTipos = useMemo(() => {
    if (tiposApi && tiposApi.length > 0) {
      return tiposApi.map((t) => t.nombre);
    }
    return TIPOS_ESTABLECIMIENTO_DEFAULT;
  }, [tiposApi]);

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
    // mx: 'auto' centra el formulario en pantallas anchas
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <PageHeader
        etiqueta="Empresa"
        titulo="Nueva solicitud BPM"
        icono={<DescriptionOutlinedIcon />}
        accion={
          <Button variant="outlined" component={RouterLink} to="/empresa" startIcon={<ArrowBackIcon />}>
            Volver a Mi Empresa
          </Button>
        }
      />

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
              select
              label="Tipo de establecimiento *"
              fullWidth
              required
              margin="normal"
              value={tipoEstablecimiento}
              onChange={(e) => setTipoEstablecimiento(e.target.value)}
              disabled={enviando}
              helperText="Selecciona el tipo de establecimiento predefinido que corresponda a tus operaciones"
            >
              <MenuItem value="" disabled>
                -- Selecciona un tipo predefinido --
              </MenuItem>
              {opcionesTipos.map((tipo) => (
                <MenuItem key={tipo} value={tipo}>
                  {tipo}
                </MenuItem>
              ))}
            </TextField>
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
                solo puedes guardar la solicitud como borrador — enviarla directamente necesita
                elegir un establecimiento.{' '}
                <RouterLink to="/empresa/establecimientos/nuevo">Registrar uno ahora</RouterLink>.
              </Typography>
            )}
          </Card>
        )}

        {paso === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Revisa los datos antes de guardar.
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
          {paso === 0 ? (
            <Button onClick={() => navigate('/empresa')}>
              Cancelar y volver
            </Button>
          ) : (
            <Button disabled={enviando} onClick={() => setPaso((p) => p - 1)}>
              Atrás
            </Button>
          )}

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
