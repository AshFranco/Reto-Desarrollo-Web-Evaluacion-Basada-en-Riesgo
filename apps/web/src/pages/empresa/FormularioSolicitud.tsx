import { useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/http/client';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { useSesion } from '@/lib/auth/useSesion';
import { useEmpresa } from '@/lib/empresa/useEmpresas';
import { useCrearSolicitud, useEnviarSolicitud } from '@/lib/empresa/useSolicitudes';
import {
  useAdjuntosSolicitud,
  useSubirAdjunto,
  useEliminarAdjunto,
} from '@/lib/empresa/useAdjuntosSolicitud';
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

const ETIQUETA_TIPO_ADJUNTO: Record<string, string> = {
  CROQUIS: 'Croquis',
  MEMORIA_DESCRIPTIVA: 'Memoria Descriptiva',
  OTRO: 'Otro',
};

const PASOS = ['Datos básicos', 'Establecimiento', 'Adjuntos', 'Confirmar'];

export default function FormularioSolicitud() {
  const navigate = useNavigate();
  const { sesion } = useSesion();
  const empresaId = sesion?.usuario.empresaId ?? null;
  const { data: empresa } = useEmpresa(empresaId);
  const establecimientos = empresa?.establecimientos ?? [];

  const crearSolicitud = useCrearSolicitud();
  const enviarSolicitud = useEnviarSolicitud();
  const subirAdjunto = useSubirAdjunto();
  const eliminarAdjunto = useEliminarAdjunto();

  const { data: tiposApi } = useQuery({
    queryKey: ['tipos-establecimiento'],
    queryFn: () =>
      apiFetchJson<TipoEstablecimientoCatalogo[]>(
        '/api/v1/catalogos/tipos-establecimiento',
      ),
  });

  const opcionesTipos =
    tiposApi && tiposApi.length > 0
      ? tiposApi.map((t) => t.nombre)
      : TIPOS_ESTABLECIMIENTO_DEFAULT;

  const [paso, setPaso] = useState(0);

  // Datos del formulario
  const [tipoEstablecimiento, setTipoEstablecimiento] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');

  // Solicitud creada en el backend (disponible desde paso 1)
  const [solicitudId, setSolicitudId] = useState<string | null>(null);

  // Adjuntos
  const [tipoAdjunto, setTipoAdjunto] = useState<
    'CROQUIS' | 'MEMORIA_DESCRIPTIVA' | 'OTRO'
  >('CROQUIS');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);

  const { data: adjuntos = [], isLoading: cargandoAdjuntos } =
    useAdjuntosSolicitud(solicitudId);

  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const creandoSolicitud = crearSolicitud.isPending;
  const enviando = enviarSolicitud.isPending;
  const camposBasicosCompletos =
    tipoEstablecimiento.trim() !== '' && motivo.trim() !== '';

  // Crea el borrador al avanzar del Paso 0 al 1.
  // Si la solicitud ya fue creada (re-navegación), no la vuelve a crear.
  async function avanzarDesdePaso0() {
    if (solicitudId) {
      setPaso(1);
      return;
    }
    setError(null);
    try {
      const solicitud = await crearSolicitud.mutateAsync({
        tipoEstablecimiento,
        motivo,
        observaciones: observaciones || undefined,
      });
      setSolicitudId(solicitud.id);
      setPaso(1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar la solicitud',
      );
    }
  }

  async function subirArchivo(archivo: File) {
    if (!solicitudId) return;
    setError(null);
    setSubiendoAdjunto(true);
    try {
      await subirAdjunto.mutateAsync({ solicitudId, archivo, tipo: tipoAdjunto });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al subir el adjunto',
      );
    } finally {
      setSubiendoAdjunto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function eliminarAdjuntoById(adjuntoId: string) {
    if (!solicitudId) return;
    setError(null);
    try {
      await eliminarAdjunto.mutateAsync({ adjuntoId, solicitudId });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al eliminar el adjunto',
      );
    }
  }

  async function enviar() {
    if (!solicitudId) return;
    setError(null);
    setExito(null);
    try {
      await enviarSolicitud.mutateAsync({ id: solicitudId, establecimientoId });
      setExito('Solicitud enviada correctamente.');
      setTimeout(() => navigate('/empresa'), 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al enviar la solicitud',
      );
    }
  }

  async function guardarBorrador() {
    if (solicitudId) {
      // Ya existe el borrador; navegar directamente
      setExito('Solicitud guardada como borrador.');
      setTimeout(() => navigate('/empresa'), 1200);
    }
  }

  function formatBytes(bytes: string | null) {
    if (!bytes) return '';
    const n = parseInt(bytes, 10);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <PageHeader
        etiqueta="Empresa"
        titulo="Nueva solicitud BPM"
        icono={<DescriptionOutlinedIcon />}
        accion={
          <Button
            variant="outlined"
            component={RouterLink}
            to="/empresa"
            startIcon={<ArrowBackIcon />}
          >
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

        {/* ── PASO 0: Datos básicos ── */}
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
              disabled={creandoSolicitud}
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
              disabled={creandoSolicitud}
            />
            <TextField
              label="Observaciones (opcional)"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={creandoSolicitud}
            />
          </Box>
        )}

        {/* ── PASO 1: Establecimiento ── */}
        {paso === 1 && (
          <Card
            variant="outlined"
            sx={{ padding: 2.5, backgroundColor: 'action.hover' }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Establecimiento (necesario solo para enviar, no para guardar como
              borrador)
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
                Tu empresa todavía no tiene ningún establecimiento registrado,
                así que por ahora solo puedes guardar la solicitud como borrador
                — enviarla directamente necesita elegir un establecimiento.{' '}
                <RouterLink to="/empresa/establecimientos/nuevo">
                  Registrar uno ahora
                </RouterLink>
                .
              </Typography>
            )}
          </Card>
        )}

        {/* ── PASO 2: Adjuntos ── */}
        {paso === 2 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Documentación adjunta
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Adjunta el croquis y/o la memoria descriptiva antes de enviar tu
              solicitud. Solo puedes agregar o eliminar archivos mientras la
              solicitud esté en borrador (antes de enviar). Máx. 15 MB por
              archivo.
            </Typography>

            {/* Selector de tipo + botón de subida */}
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                mb: 2,
              }}
            >
              <TextField
                select
                label="Tipo de documento"
                size="small"
                value={tipoAdjunto}
                onChange={(e) =>
                  setTipoAdjunto(
                    e.target.value as 'CROQUIS' | 'MEMORIA_DESCRIPTIVA' | 'OTRO',
                  )
                }
                sx={{ minWidth: 200 }}
                disabled={subiendoAdjunto}
              >
                <MenuItem value="CROQUIS">Croquis</MenuItem>
                <MenuItem value="MEMORIA_DESCRIPTIVA">
                  Memoria Descriptiva
                </MenuItem>
                <MenuItem value="OTRO">Otro</MenuItem>
              </TextField>

              <input
                id="input-adjunto-solicitud"
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) subirArchivo(file);
                }}
              />
              <Button
                id="btn-subir-adjunto"
                variant="outlined"
                component="label"
                htmlFor="input-adjunto-solicitud"
                startIcon={
                  subiendoAdjunto ? (
                    <CircularProgress size={16} />
                  ) : (
                    <UploadFileIcon />
                  )
                }
                disabled={subiendoAdjunto}
              >
                {subiendoAdjunto ? 'Subiendo…' : 'Seleccionar archivo'}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Lista de adjuntos ya subidos */}
            {cargandoAdjuntos ? (
              <CircularProgress size={24} sx={{ display: 'block', mx: 'auto' }} />
            ) : adjuntos.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 3,
                  color: 'text.secondary',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <AttachFileIcon sx={{ fontSize: 32, mb: 0.5, opacity: 0.4 }} />
                <Typography variant="body2">
                  Aún no se han adjuntado documentos.
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {adjuntos.map((adj) => (
                  <ListItem
                    key={adj.id}
                    disablePadding
                    sx={{
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      mb: 1,
                      px: 1.5,
                      py: 0.5,
                    }}
                    secondaryAction={
                      <Tooltip title="Eliminar adjunto">
                        <IconButton
                          edge="end"
                          size="small"
                          color="error"
                          id={`btn-eliminar-adjunto-${adj.id}`}
                          onClick={() => eliminarAdjuntoById(adj.id)}
                          disabled={eliminarAdjunto.isPending}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <InsertDriveFileOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={adj.nombreArchivo}
                      secondary={
                        <Box
                          component="span"
                          sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                        >
                          <Chip
                            label={ETIQUETA_TIPO_ADJUNTO[adj.tipo] ?? adj.tipo}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: 10 }}
                          />
                          {formatBytes(adj.tamanoBytes)}
                        </Box>
                      }
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* ── PASO 3: Confirmar ── */}
        {paso === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Revisa los datos antes de enviar.
            </Typography>
            <Typography variant="body2">
              <strong>Tipo de establecimiento:</strong>{' '}
              {tipoEstablecimiento || '—'}
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
              {establecimientos.find((e) => e.id === establecimientoId)
                ?.nombre ?? 'No seleccionado'}
            </Typography>
            <Typography variant="body2">
              <strong>Adjuntos:</strong>{' '}
              {adjuntos.length > 0
                ? `${adjuntos.length} archivo(s) adjunto(s)`
                : 'Ninguno'}
            </Typography>
          </Box>
        )}

        {/* ── Navegación entre pasos ── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            justifyContent: 'space-between',
            gap: 2,
            mt: 4,
          }}
        >
          {paso === 0 ? (
            <Button
              fullWidth
              onClick={() => navigate('/empresa')}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Cancelar y volver
            </Button>
          ) : (
            <Button
              disabled={creandoSolicitud || enviando}
              onClick={() => setPaso((p) => p - 1)}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Atrás
            </Button>
          )}

          {paso < PASOS.length - 1 ? (
            <Button
              variant="contained"
              disabled={
                (paso === 0 && (!camposBasicosCompletos || creandoSolicitud)) ||
                (paso === 1 && !solicitudId)
              }
              onClick={() => {
                if (paso === 0) {
                  avanzarDesdePaso0();
                } else {
                  setPaso((p) => p + 1);
                }
              }}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {paso === 0 && creandoSolicitud ? (
                <CircularProgress size={20} />
              ) : (
                'Siguiente'
              )}
            </Button>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1,
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              <Button
                variant="outlined"
                fullWidth
                disabled={enviando || !camposBasicosCompletos}
                onClick={guardarBorrador}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Guardar borrador
              </Button>
              <Button
                variant="contained"
                fullWidth
                disabled={
                  enviando || !camposBasicosCompletos || !establecimientoId
                }
                onClick={enviar}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
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
