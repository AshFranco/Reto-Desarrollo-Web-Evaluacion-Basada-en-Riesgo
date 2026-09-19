import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import { PageHeader } from '@/components/ui/PageHeader';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { EstadoChip } from '@/components/ui/EstadoChip';
import {
  useDenuncias,
  useCrearDenuncia,
  useResolverDenuncia,
  type Denuncia,
} from '@/lib/coordinador/useDenuncias';
import { useEstablecimientos } from '@/lib/empresa/useEstablecimientos';

function etiquetaResultado(resultado: Denuncia['resultado']) {
  if (resultado === 'PROCEDE') return 'Procede';
  if (resultado === 'NO_PROCEDE') return 'No procede';
  if (resultado === 'REMISION') return 'Remisión';
  return 'Pendiente';
}

/**
 * No existe un campo `esAnonima` en el backend (confirmado en
 * CrearDenunciaDto, denuncias.service.ts y el modelo Prisma `Denuncia`) --
 * el anonimato se logra simplemente no mandando `denunciante`. Este
 * checkbox es solo de UI: si está marcado, oculta el campo y lo omite del
 * envío en vez de mandar un flag que el backend no tiene.
 */
function FormularioNuevaDenuncia() {
  const crear = useCrearDenuncia();
  const { data: establecimientos } = useEstablecimientos();
  const [tipoDenuncia, setTipoDenuncia] = useState('');
  const [fechaRecepcion, setFechaRecepcion] = useState('');
  const [esAnonima, setEsAnonima] = useState(false);
  const [denunciante, setDenunciante] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function registrar() {
    setError(null);
    setExito(false);
    if (!fechaRecepcion) {
      setError('La fecha de recepción es obligatoria.');
      return;
    }
    try {
      await crear.mutateAsync({
        tipoDenuncia: tipoDenuncia.trim() || undefined,
        fechaRecepcion,
        denunciante: esAnonima ? undefined : denunciante.trim() || undefined,
        establecimientoId: establecimientoId || undefined,
        descripcion: descripcion.trim() || undefined,
      });
      setTipoDenuncia('');
      setFechaRecepcion('');
      setEsAnonima(false);
      setDenunciante('');
      setEstablecimientoId('');
      setDescripcion('');
      setExito(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la denuncia');
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        Registrar nueva denuncia
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {exito && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Denuncia registrada.
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Tipo de denuncia"
          size="small"
          value={tipoDenuncia}
          onChange={(e) => setTipoDenuncia(e.target.value)}
          disabled={crear.isPending}
          sx={{ minWidth: 200 }}
        />
        <TextField
          label="Fecha de recepción"
          type="date"
          required
          size="small"
          value={fechaRecepcion}
          onChange={(e) => setFechaRecepcion(e.target.value)}
          disabled={crear.isPending}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          select
          label="Establecimiento"
          size="small"
          value={establecimientoId}
          onChange={(e) => setEstablecimientoId(e.target.value)}
          disabled={crear.isPending}
          helperText="Hace falta para poder marcar 'Procede' más adelante."
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">— Sin asignar todavía —</MenuItem>
          {(establecimientos ?? []).map((e) => (
            <MenuItem key={e.id} value={e.id}>
              {e.nombre}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <FormControlLabel
        sx={{ mt: 1 }}
        control={
          <Checkbox
            checked={esAnonima}
            onChange={(e) => setEsAnonima(e.target.checked)}
            disabled={crear.isPending}
          />
        }
        label="Denuncia anónima (no se pedirán ni mostrarán datos del denunciante)"
      />

      {!esAnonima && (
        <TextField
          label="Denunciante"
          size="small"
          fullWidth
          sx={{ mt: 1 }}
          value={denunciante}
          onChange={(e) => setDenunciante(e.target.value)}
          disabled={crear.isPending}
        />
      )}

      <TextField
        label="Descripción"
        size="small"
        fullWidth
        multiline
        rows={2}
        sx={{ mt: 2 }}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        disabled={crear.isPending}
      />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" disabled={crear.isPending} onClick={registrar}>
          {crear.isPending ? <CircularProgress size={20} /> : 'Registrar denuncia'}
        </Button>
      </Box>
    </Paper>
  );
}

function DialogoResolverDenuncia({
  denuncia,
  open,
  onClose,
}: {
  denuncia: Denuncia | null;
  open: boolean;
  onClose: () => void;
}) {
  const resolver = useResolverDenuncia();
  const [error, setError] = useState<string | null>(null);

  async function resolverComo(resultado: 'PROCEDE' | 'NO_PROCEDE' | 'REMISION') {
    if (!denuncia) return;
    setError(null);
    try {
      await resolver.mutateAsync({ id: denuncia.id, resultado });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resolver la denuncia');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Resolver denuncia</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!denuncia?.idEstablecimiento && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta denuncia no tiene un establecimiento asociado. Si elegís "Procede", el servidor la va a
            rechazar — hace falta el establecimiento para poder generar el caso.
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          ¿Cuál es el resultado de esta denuncia?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap' }}>
        <Button onClick={onClose} disabled={resolver.isPending}>
          Cancelar
        </Button>
        <Button
          color="error"
          variant="outlined"
          disabled={resolver.isPending}
          onClick={() => resolverComo('NO_PROCEDE')}
        >
          No procede
        </Button>
        <Button
          variant="outlined"
          disabled={resolver.isPending}
          onClick={() => resolverComo('REMISION')}
        >
          Remisión
        </Button>
        <Button
          color="success"
          variant="contained"
          disabled={resolver.isPending}
          onClick={() => resolverComo('PROCEDE')}
        >
          {resolver.isPending ? <CircularProgress size={18} /> : 'Procede'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TablaDenuncias() {
  const { data: denuncias, isLoading, isError, error } = useDenuncias();
  const [denunciaResolver, setDenunciaResolver] = useState<Denuncia | null>(null);

  if (isLoading) return <EstadoCarga etiqueta="Cargando denuncias…" />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar las denuncias'}</Alert>;
  }
  if (!denuncias || denuncias.length === 0) {
    return <EstadoVacio titulo="No hay denuncias registradas." icono={<GavelOutlinedIcon fontSize="large" />} />;
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Denunciante</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {denuncias.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.tipoDenuncia ?? '—'}</TableCell>
                <TableCell>{new Date(d.fechaRecepcion).toLocaleDateString()}</TableCell>
                <TableCell>{d.denunciante ?? 'Anónima'}</TableCell>
                <TableCell>
                  <EstadoChip estado={etiquetaResultado(d.resultado)} />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!!d.resultado}
                    onClick={() => setDenunciaResolver(d)}
                  >
                    {d.resultado ? 'Resuelta' : 'Resolver'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <DialogoResolverDenuncia
        denuncia={denunciaResolver}
        open={!!denunciaResolver}
        onClose={() => setDenunciaResolver(null)}
      />
    </>
  );
}

export default function Denuncias() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader etiqueta="Coordinador" titulo="Denuncias" icono={<GavelOutlinedIcon />} />
      <FormularioNuevaDenuncia />
      <Box>
        <Typography variant="h6" gutterBottom>
          Denuncias registradas
        </Typography>
        <TablaDenuncias />
      </Box>
    </Box>
  );
}
