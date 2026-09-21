import { useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { registro, type DatosRegistro, type RolRegistrable } from '@/lib/auth/registro';
import { useEmpresasPublicas } from '@/lib/empresa/useEmpresas';
import { LogoSinec } from '@/components/ui/LogoSinec';

const ROLES: { valor: RolRegistrable; etiqueta: string }[] = [
  { valor: 'ADMINISTRADOR_EMPRESA', etiqueta: 'Administrador de empresa' },
  { valor: 'USUARIO_DELEGADO', etiqueta: 'Usuario delegado' },
];

const DATOS_VACIOS: DatosRegistro = {
  nombreCompleto: '',
  cedulaPasaporte: '',
  correo: '',
  telefono: '',
  password: '',
  rol: 'ADMINISTRADOR_EMPRESA',
  empresaId: '',
  cartaAutorizacionUrl: '',
};

export default function Registro() {
  const [datos, setDatos] = useState<DatosRegistro>(DATOS_VACIOS);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<'CEDULA' | 'RNC' | 'PASAPORTE'>('CEDULA');
  const { data: empresas, isLoading: cargandoEmpresas, isError: errorEmpresas } = useEmpresasPublicas();

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await registro({
        ...datos,
        telefono: datos.telefono?.trim() || undefined,
        cartaAutorizacionUrl: datos.cartaAutorizacionUrl?.trim() || undefined,
      });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 2,
        background: (t) =>
          `radial-gradient(circle at 15% 10%, ${alpha(t.palette.primary.main, 0.1)} 0%, transparent 45%),
           radial-gradient(circle at 85% 90%, ${alpha(t.palette.primary.light, 0.12)} 0%, transparent 50%)`,
      }}
    >
      <Paper
        component={enviado ? 'div' : 'form'}
        onSubmit={enviado ? undefined : manejarSubmit}
        variant="outlined"
        sx={{ padding: 4, width: '100%', maxWidth: 440 }}
      >
        <LogoSinec />

        {enviado ? (
          <>
            <Typography variant="h5" gutterBottom>
              Registro enviado
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              Tu registro quedó pendiente de aprobación. Un administrador debe validar tu cuenta
              antes de que puedas iniciar sesión.
            </Alert>
            <Link component={RouterLink} to="/login" underline="hover">
              Volver a iniciar sesión
            </Link>
          </>
        ) : (
          <>
            <Typography variant="h5" gutterBottom>
              Crear cuenta
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Nombre completo"
              fullWidth
              required
              margin="normal"
              value={datos.nombreCompleto}
              onChange={(e) => setDatos((d) => ({ ...d, nombreCompleto: e.target.value }))}
              disabled={cargando}
            />
            <TextField
              select
              label="Tipo de documento"
              fullWidth
              margin="normal"
              value={tipoDocumento}
              onChange={(e) => {
                setTipoDocumento(e.target.value as any);
                setDatos((d) => ({ ...d, cedulaPasaporte: '' }));
              }}
              disabled={cargando}
            >
              <MenuItem value="CEDULA">Cédula Dominicana (11 dígitos)</MenuItem>
              <MenuItem value="RNC">RNC (de 9 o de 11 dígitos)</MenuItem>
              <MenuItem value="PASAPORTE">Pasaporte (Extranjero)</MenuItem>
            </TextField>
            <TextField
              label="Cédula o pasaporte"
              fullWidth
              required
              margin="normal"
              helperText={
                tipoDocumento === 'CEDULA'
                  ? 'Solo 11 dígitos numéricos sin letras.'
                  : tipoDocumento === 'RNC'
                  ? 'Solo números, de 9 o de 11 dígitos.'
                  : 'Alfanumérico (mínimo 5 caracteres).'
              }
              value={datos.cedulaPasaporte}
              onChange={(e) => {
                const val = e.target.value;
                let filtrado = val;
                if (tipoDocumento === 'CEDULA' || tipoDocumento === 'RNC') {
                  filtrado = val.replace(/[^0-9-]/g, '').slice(0, 13);
                } else {
                  filtrado = val.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
                }
                setDatos((d) => ({ ...d, cedulaPasaporte: filtrado }));
              }}
              disabled={cargando}
              inputProps={{
                maxLength: tipoDocumento === 'PASAPORTE' ? 20 : 13,
              }}
            />
            <TextField
              label="Correo"
              type="email"
              fullWidth
              required
              margin="normal"
              value={datos.correo}
              onChange={(e) => setDatos((d) => ({ ...d, correo: e.target.value }))}
              disabled={cargando}
            />
            <TextField
              label="Teléfono (opcional)"
              fullWidth
              margin="normal"
              placeholder="+1 809 555 1234"
              value={datos.telefono}
              onChange={(e) => setDatos((d) => ({ ...d, telefono: e.target.value }))}
              disabled={cargando}
            />
            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              required
              margin="normal"
              helperText="Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo."
              value={datos.password}
              onChange={(e) => setDatos((d) => ({ ...d, password: e.target.value }))}
              disabled={cargando}
            />
            <TextField
              select
              label="Rol solicitado"
              fullWidth
              required
              margin="normal"
              value={datos.rol}
              onChange={(e) => setDatos((d) => ({ ...d, rol: e.target.value as RolRegistrable }))}
              disabled={cargando}
            >
              {ROLES.map((r) => (
                <MenuItem key={r.valor} value={r.valor}>
                  {r.etiqueta}
                </MenuItem>
              ))}
            </TextField>
            {errorEmpresas ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                No se pudo cargar la lista de empresas. Recargue la página e intente de nuevo.
              </Alert>
            ) : (
              <TextField
                select
                label="Empresa"
                fullWidth
                required
                margin="normal"
                helperText={cargandoEmpresas ? 'Cargando empresas…' : 'Seleccione la empresa a la que pertenece.'}
                value={datos.empresaId}
                onChange={(e) => setDatos((d) => ({ ...d, empresaId: e.target.value }))}
                disabled={cargando || cargandoEmpresas}
              >
                {(empresas ?? []).map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.razonSocial} (RNC: {e.rnc})
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Carta de autorización (URL, opcional)"
              fullWidth
              margin="normal"
              placeholder="https://..."
              helperText="Enlace al documento que autoriza su registro en nombre de la empresa, si ya dispone de él."
              value={datos.cartaAutorizacionUrl}
              onChange={(e) => setDatos((d) => ({ ...d, cartaAutorizacionUrl: e.target.value }))}
              disabled={cargando}
            />

            <Button type="submit" variant="contained" fullWidth disabled={cargando} sx={{ mt: 2 }}>
              {cargando ? <CircularProgress size={24} color="inherit" /> : 'Registrarme'}
            </Button>

            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
              ¿Ya tiene una cuenta?{' '}
              <Link component={RouterLink} to="/login" underline="hover">
                Iniciar sesión
              </Link>
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
}
