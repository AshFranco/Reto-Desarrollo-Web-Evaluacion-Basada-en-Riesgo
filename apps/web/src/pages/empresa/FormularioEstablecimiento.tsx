import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';

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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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

// Regex de validaciones en cliente ── deben aceptar los mismos valores que el backend.
const RNC_REGEX = /^[0-9]{9}$|^[0-9]{11}$/;
const TELEFONO_REGEX = /^[0-9]{10}$/;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ErroresCampo {
  rnc?: string;
  telefono?: string;
  correo?: string;
  numeroPermisoSanitario?: string;
  produccionAnual?: string;
  empleadosMasculino?: string;
  empleadosFemenino?: string;
}

function validarCampos(datos: DatosEstablecimiento): ErroresCampo {
  const errores: ErroresCampo = {};

  if (datos.rnc) {
    if (datos.rnc.includes('-')) {
      errores.rnc = 'El RNC no puede contener signos negativos ni guiones.';
    } else if (!RNC_REGEX.test(datos.rnc)) {
      errores.rnc = 'El RNC debe ser numérico y de 9 o de 11 dígitos.';
    }
  }

  if (datos.telefono) {
    if (datos.telefono.includes('-')) {
      errores.telefono = 'El teléfono no puede contener signos negativos ni guiones.';
    } else if (!TELEFONO_REGEX.test(datos.telefono)) {
      errores.telefono = 'El teléfono debe contener exactamente 10 dígitos numéricos.';
    }
  }

  if (datos.correo && !CORREO_REGEX.test(datos.correo)) {
    errores.correo = 'El correo electrónico no es válido.';
  }

  if (datos.numeroPermisoSanitario && datos.numeroPermisoSanitario.length > 50) {
    errores.numeroPermisoSanitario = 'El número de permiso no puede superar los 50 caracteres.';
  }

  if (datos.produccionAnual !== undefined) {
    if (datos.produccionAnual < 0) {
      errores.produccionAnual = 'La producción anual debe ser un valor positivo.';
    } else if (datos.produccionAnual > 1000000000) {
      errores.produccionAnual = 'La producción anual no puede superar 1,000,000,000.';
    }
  }

  if (datos.empleadosMasculino !== undefined) {
    if (datos.empleadosMasculino < 0 || !Number.isInteger(datos.empleadosMasculino)) {
      errores.empleadosMasculino = 'Debe ser un número entero positivo.';
    } else if (datos.empleadosMasculino > 1000000) {
      errores.empleadosMasculino = 'El número de empleados no puede superar 1,000,000.';
    }
  }

  if (datos.empleadosFemenino !== undefined) {
    if (datos.empleadosFemenino < 0 || !Number.isInteger(datos.empleadosFemenino)) {
      errores.empleadosFemenino = 'Debe ser un número entero positivo.';
    } else if (datos.empleadosFemenino > 1000000) {
      errores.empleadosFemenino = 'El número de empleadas no puede superar 1,000,000.';
    }
  }
  return errores;
}


export default function FormularioEstablecimiento() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const esEdicion = !!id;

  const { data: existente, isLoading: cargandoExistente } = useEstablecimiento(id);
  const crear = useCrearEstablecimiento();
  const editar = useEditarEstablecimiento(id ?? '');

  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<DatosEstablecimiento>(DATOS_VACIOS);
  const [erroresCampo, setErroresCampo] = useState<ErroresCampo>({});
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
  const hayErroresCampo = Object.keys(erroresCampo).length > 0;

  function actualizarCampo<K extends keyof DatosEstablecimiento>(campo: K, valor: DatosEstablecimiento[K]) {
    const nuevosDatos = { ...datos, [campo]: valor };
    setDatos(nuevosDatos);
    // Re-validar en tiempo real al escribir
    setErroresCampo(validarCampos(nuevosDatos));
  }

  async function guardar() {
    const errores = validarCampos(datos);
    if (Object.keys(errores).length > 0) {
      setErroresCampo(errores);
      return;
    }
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
    // mx: 'auto' centra el formulario en pantallas anchas
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <PageHeader
        etiqueta="Empresa"
        titulo={esEdicion ? 'Editar establecimiento' : 'Nuevo establecimiento'}
        icono={<DomainOutlinedIcon />}
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
              error={!!erroresCampo.rnc}
              helperText={erroresCampo.rnc ?? 'Solo números, de 9 o de 11 dígitos'}
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
              error={!!erroresCampo.telefono}
              helperText={erroresCampo.telefono ?? '10 dígitos numéricos'}
              inputProps={{ maxLength: 10 }}
            />
            <TextField
              label="Correo electrónico"
              fullWidth
              margin="normal"
              value={datos.correo}
              onChange={(e) => actualizarCampo('correo', e.target.value)}
              disabled={enviando}
              error={!!erroresCampo.correo}
              helperText={erroresCampo.correo}
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
              error={!!erroresCampo.numeroPermisoSanitario}
              helperText={erroresCampo.numeroPermisoSanitario}
              inputProps={{ maxLength: 50 }}
            />
            <TextField
              label="Producción anual"
              type="number"
              fullWidth
              margin="normal"
              value={datos.produccionAnual ?? ''}
              onChange={(e) => actualizarCampo('produccionAnual', e.target.value ? Number(e.target.value) : undefined)}
              disabled={enviando}
              error={!!erroresCampo.produccionAnual}
              helperText={erroresCampo.produccionAnual}
              inputProps={{ min: 0, max: 1000000000 }}
            />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 0, sm: 2 } }}>
              <TextField
                label="Empleados (hombres)"
                type="number"
                fullWidth
                margin="normal"
                value={datos.empleadosMasculino ?? ''}
                onChange={(e) => actualizarCampo('empleadosMasculino', e.target.value ? Number(e.target.value) : undefined)}
                disabled={enviando}
                error={!!erroresCampo.empleadosMasculino}
                helperText={erroresCampo.empleadosMasculino}
                inputProps={{ min: 0, max: 1000000, step: 1 }}
              />
              <TextField
                label="Empleados (mujeres)"
                type="number"
                fullWidth
                margin="normal"
                value={datos.empleadosFemenino ?? ''}
                onChange={(e) => actualizarCampo('empleadosFemenino', e.target.value ? Number(e.target.value) : undefined)}
                disabled={enviando}
                error={!!erroresCampo.empleadosFemenino}
                helperText={erroresCampo.empleadosFemenino}
                inputProps={{ min: 0, max: 1000000, step: 1 }}
              />
            </Box>
            <TextField
              label="Mercado objetivo"
              fullWidth
              margin="normal"
              value={datos.mercadoObjetivo}
              onChange={(e) => actualizarCampo('mercadoObjetivo', e.target.value)}
              disabled={enviando}
              inputProps={{ maxLength: 150 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, justifyContent: 'space-between', gap: 2, mt: 4 }}>
          {paso === 0 ? (
            <Button fullWidth onClick={() => navigate('/empresa')} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Cancelar y volver
            </Button>
          ) : (
            <Button disabled={enviando} onClick={() => setPaso((p) => p - 1)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Atrás
            </Button>
          )}

          {paso === 0 ? (
            <Button
              variant="contained"
              disabled={!datosBasicosCompletos || hayErroresCampo}
              onClick={() => setPaso(1)}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={enviando || !datosBasicosCompletos || hayErroresCampo}
              onClick={guardar}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {enviando ? <CircularProgress size={20} /> : 'Guardar'}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

