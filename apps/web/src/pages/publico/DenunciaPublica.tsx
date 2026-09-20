import { useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Link,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { denunciaPublica, listarEmpresasPublicas, type DatosDenunciaPublica } from '@/lib/publico/denunciaPublica';
import logo from '@/assets/logo.png';

const DATOS_VACIOS: DatosDenunciaPublica = {
  tipoDenuncia: '',
  fechaRecepcion: '',
  denunciante: '',
  descripcion: '',
  empresaId: '',
};

export default function DenunciaPublica() {
  const [datos, setDatos] = useState<DatosDenunciaPublica>(DATOS_VACIOS);
  const [esAnonima, setEsAnonima] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referencia, setReferencia] = useState<string | null>(null);

  const {
    data: empresas,
    isLoading: cargandoEmpresas,
    isError: errorEmpresas,
  } = useQuery({
    queryKey: ['publico', 'empresas-publicas'],
    queryFn: listarEmpresasPublicas,
  });

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await denunciaPublica({
        ...datos,
        tipoDenuncia: datos.tipoDenuncia?.trim() || undefined,
        descripcion: datos.descripcion?.trim() || undefined,
        empresaId: datos.empresaId || undefined,
        denunciante: esAnonima ? undefined : datos.denunciante?.trim() || undefined,
      });
      setReferencia(resultado?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la denuncia');
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
        component={referencia ? 'div' : 'form'}
        onSubmit={referencia ? undefined : manejarSubmit}
        variant="outlined"
        sx={{ padding: 4, width: '100%', maxWidth: 480 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            component="img"
            src={logo}
            alt="SINEC"
            sx={{ width: 48, height: 48, flexShrink: 0, objectFit: 'contain' }}
          />
          <Box>
            <Typography variant="overline" color="primary.main" sx={{ lineHeight: 1.1, display: 'block' }}>
              SINEC
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Portal ciudadano de denuncias
            </Typography>
          </Box>
        </Box>

        {referencia ? (
          <>
            <Typography variant="h5" gutterBottom>
              Denuncia registrada
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              Gracias por tu denuncia. Quedó registrada con el número de referencia <strong>{referencia}</strong>.
            </Alert>
            <Link component={RouterLink} to="/login" underline="hover">
              Volver al inicio
            </Link>
          </>
        ) : (
          <>
            <Typography variant="h5" gutterBottom>
              Registrar una denuncia
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No hace falta iniciar sesión para denunciar un establecimiento.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Tipo de denuncia"
              fullWidth
              margin="normal"
              value={datos.tipoDenuncia}
              onChange={(e) => setDatos((d) => ({ ...d, tipoDenuncia: e.target.value }))}
              disabled={cargando}
            />
            <TextField
              label="Fecha"
              type="date"
              required
              fullWidth
              margin="normal"
              value={datos.fechaRecepcion}
              onChange={(e) => setDatos((d) => ({ ...d, fechaRecepcion: e.target.value }))}
              disabled={cargando}
              InputLabelProps={{ shrink: true }}
            />

            {errorEmpresas ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                No se pudo cargar la lista de empresas. Recargue la página e intente de nuevo.
              </Alert>
            ) : (
              <TextField
                select
                label="Empresa denunciada"
                fullWidth
                margin="normal"
                helperText={cargandoEmpresas ? 'Cargando empresas…' : 'Opcional, si la conoce.'}
                value={datos.empresaId}
                onChange={(e) => setDatos((d) => ({ ...d, empresaId: e.target.value }))}
                disabled={cargando || cargandoEmpresas}
              >
                <MenuItem value="">— No sé / prefiero no indicarla —</MenuItem>
                {(empresas ?? []).map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.razonSocial} (RNC: {e.rnc})
                  </MenuItem>
                ))}
              </TextField>
            )}

            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Checkbox
                  checked={esAnonima}
                  onChange={(e) => setEsAnonima(e.target.checked)}
                  disabled={cargando}
                />
              }
              label="Denuncia anónima (no se pedirán ni mostrarán mis datos)"
            />

            {!esAnonima && (
              <TextField
                label="Tu nombre (opcional)"
                fullWidth
                margin="normal"
                value={datos.denunciante}
                onChange={(e) => setDatos((d) => ({ ...d, denunciante: e.target.value }))}
                disabled={cargando}
              />
            )}

            <TextField
              label="Descripción de la denuncia"
              fullWidth
              multiline
              rows={4}
              margin="normal"
              value={datos.descripcion}
              onChange={(e) => setDatos((d) => ({ ...d, descripcion: e.target.value }))}
              disabled={cargando}
            />

            <Button type="submit" variant="contained" fullWidth disabled={cargando} sx={{ mt: 2 }}>
              {cargando ? <CircularProgress size={24} color="inherit" /> : 'Enviar denuncia'}
            </Button>

            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" underline="hover">
                Volver al inicio de sesión
              </Link>
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
}
