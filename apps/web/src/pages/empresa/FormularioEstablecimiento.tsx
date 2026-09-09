import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import {
  useEstablecimiento,
  useCrearEstablecimiento,
  useEditarEstablecimiento,
  type DatosEstablecimiento,
} from '@/lib/empresa/useEstablecimientos';
import { PageHeader } from '@/components/ui/PageHeader';

const DATOS_VACIOS: DatosEstablecimiento = {
  nombre: '',
  rnc: '',
  calle: '',
  telefono: '',
  correo: '',
  numeroPermisoSanitario: '',
  produccionAnual: undefined,
  empleadosMasculino: undefined,
  empleadosFemenino: undefined,
  mercadoObjetivo: '',
};

const PASOS = ['Datos generales', 'Datos operativos'];

export default function FormularioEstablecimiento() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const esEdicion = !!id;

  const { data: existente, isLoading: cargandoExistente } = useEstablecimiento(id);
  const crear = useCrearEstablecimiento();
  const editar = useEditarEstablecimiento(id ?? '');

  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<DatosEstablecimiento>(DATOS_VACIOS);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (!existente) return;
    setDatos({
      nombre: existente.nombre,
      rnc: existente.rnc ?? '',
      calle: existente.calle ?? '',
      telefono: existente.telefono ?? '',
      correo: existente.correo ?? '',
      numeroPermisoSanitario: existente.numeroPermisoSanitario ?? '',
      // produccionAnual llega como string (Decimal de Prisma) — parsear a
      // number acá, que es lo que el DTO de creación/edición espera.
      produccionAnual: existente.produccionAnual ? Number(existente.produccionAnual) : undefined,
      empleadosMasculino: existente.empleadosMasculino ?? undefined,
      empleadosFemenino: existente.empleadosFemenino ?? undefined,
      mercadoObjetivo: existente.mercadoObjetivo ?? '',
    });
  }, [existente]);

  const enviando = crear.isPending || editar.isPending;
  const datosBasicosCompletos = datos.nombre.trim() !== '';

  function actualizarCampo<K extends keyof DatosEstablecimiento>(campo: K, valor: DatosEstablecimiento[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    setError(null);
    setExito(false);
    try {
      if (esEdicion) {
        await editar.mutateAsync(datos);
      } else {
        await crear.mutateAsync(datos);
      }
      setExito(true);
      setTimeout(() => navigate('/empresa'), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el establecimiento');
    }
  }

  if (esEdicion && cargandoExistente) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Cargando establecimiento…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      <PageHeader
        etiqueta="Empresa"
        titulo={esEdicion ? 'Editar establecimiento' : 'Nuevo establecimiento'}
        icono={<DomainOutlinedIcon />}
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
            Establecimiento guardado correctamente.
          </Alert>
        )}

        {paso === 0 && (
          <Box>
            <TextField
              label="Nombre"
              fullWidth
              required
              margin="normal"
              value={datos.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              disabled={enviando}
            />
            <TextField
              label="RNC (opcional, si es distinto al de la empresa)"
              fullWidth
              margin="normal"
              value={datos.rnc}
              onChange={(e) => actualizarCampo('rnc', e.target.value)}
              disabled={enviando}
            />
            <TextField
              label="Calle / dirección"
              fullWidth
              margin="normal"
              value={datos.calle}
              onChange={(e) => actualizarCampo('calle', e.target.value)}
              disabled={enviando}
            />
            <TextField
              label="Teléfono"
              fullWidth
              margin="normal"
              value={datos.telefono}
              onChange={(e) => actualizarCampo('telefono', e.target.value)}
              disabled={enviando}
            />
            <TextField
              label="Correo"
              fullWidth
              margin="normal"
              value={datos.correo}
              onChange={(e) => actualizarCampo('correo', e.target.value)}
              disabled={enviando}
            />
          </Box>
        )}

        {paso === 1 && (
          <Box>
            <TextField
              label="Número de permiso sanitario"
              fullWidth
              margin="normal"
              value={datos.numeroPermisoSanitario}
              onChange={(e) => actualizarCampo('numeroPermisoSanitario', e.target.value)}
              disabled={enviando}
            />
            <TextField
              label="Producción anual"
              type="number"
              fullWidth
              margin="normal"
              value={datos.produccionAnual ?? ''}
              onChange={(e) => actualizarCampo('produccionAnual', e.target.value ? Number(e.target.value) : undefined)}
              disabled={enviando}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Empleados (hombres)"
                type="number"
                fullWidth
                margin="normal"
                value={datos.empleadosMasculino ?? ''}
                onChange={(e) => actualizarCampo('empleadosMasculino', e.target.value ? Number(e.target.value) : undefined)}
                disabled={enviando}
              />
              <TextField
                label="Empleados (mujeres)"
                type="number"
                fullWidth
                margin="normal"
                value={datos.empleadosFemenino ?? ''}
                onChange={(e) => actualizarCampo('empleadosFemenino', e.target.value ? Number(e.target.value) : undefined)}
                disabled={enviando}
              />
            </Box>
            <TextField
              label="Mercado objetivo"
              fullWidth
              margin="normal"
              value={datos.mercadoObjetivo}
              onChange={(e) => actualizarCampo('mercadoObjetivo', e.target.value)}
              disabled={enviando}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 4 }}>
          <Button disabled={paso === 0 || enviando} onClick={() => setPaso((p) => p - 1)}>
            Atrás
          </Button>

          {paso === 0 ? (
            <Button variant="contained" disabled={!datosBasicosCompletos} onClick={() => setPaso(1)}>
              Siguiente
            </Button>
          ) : (
            <Button variant="contained" disabled={enviando || !datosBasicosCompletos} onClick={guardar}>
              {enviando ? <CircularProgress size={20} /> : 'Guardar'}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
