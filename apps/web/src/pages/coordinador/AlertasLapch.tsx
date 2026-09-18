import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { PageHeader } from '@/components/ui/PageHeader';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { EstadoChip } from '@/components/ui/EstadoChip';
import {
  useAlertasLapch,
  useCrearAlertaLapch,
  useResolverAlertaLapch,
  type AlertaLapch,
} from '@/lib/coordinador/useAlertasLapch';
import { useEstablecimientos } from '@/lib/empresa/useEstablecimientos';

function etiquetaResultado(resultado: AlertaLapch['resultado']) {
  if (resultado === 'PROCEDE') return 'Procede';
  if (resultado === 'NO_PROCEDE') return 'No procede';
  return 'Pendiente';
}

function FormularioNuevaAlerta() {
  const crear = useCrearAlertaLapch();
  const { data: establecimientos } = useEstablecimientos();
  const [numeroAlerta, setNumeroAlerta] = useState('');
  const [fecha, setFecha] = useState('');
  const [producto, setProducto] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function registrar() {
    setError(null);
    setExito(false);
    if (!numeroAlerta.trim() || !fecha) {
      setError('El número de alerta y la fecha son obligatorios.');
      return;
    }
    try {
      await crear.mutateAsync({
        numeroAlerta: numeroAlerta.trim(),
        fecha,
        producto: producto.trim() || undefined,
        establecimientoId: establecimientoId || undefined,
        descripcion: descripcion.trim() || undefined,
      });
      setNumeroAlerta('');
      setFecha('');
      setProducto('');
      setEstablecimientoId('');
      setDescripcion('');
      setExito(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la alerta');
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        Registrar nueva alerta LAPCH
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {exito && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Alerta registrada.
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Número de alerta"
          required
          size="small"
          value={numeroAlerta}
          onChange={(e) => setNumeroAlerta(e.target.value)}
          disabled={crear.isPending}
          sx={{ minWidth: 200 }}
        />
        <TextField
          label="Fecha"
          type="date"
          required
          size="small"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          disabled={crear.isPending}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Producto"
          size="small"
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
          disabled={crear.isPending}
          sx={{ minWidth: 200 }}
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
          {crear.isPending ? <CircularProgress size={20} /> : 'Registrar alerta'}
        </Button>
      </Box>
    </Paper>
  );
}

function DialogoResolverAlerta({
  alerta,
  open,
  onClose,
}: {
  alerta: AlertaLapch | null;
  open: boolean;
  onClose: () => void;
}) {
  const resolver = useResolverAlertaLapch();
  const [error, setError] = useState<string | null>(null);

  async function resolverComo(resultado: 'PROCEDE' | 'NO_PROCEDE') {
    if (!alerta) return;
    setError(null);
    try {
      await resolver.mutateAsync({ id: alerta.id, resultado });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resolver la alerta');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Resolver alerta {alerta?.numeroAlerta}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!alerta?.idEstablecimiento && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta alerta no tiene un establecimiento asociado. Si elegís "Procede", el servidor la va a
            rechazar — hace falta el establecimiento para poder generar el caso.
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          ¿Esta alerta procede o no procede?
        </Typography>
      </DialogContent>
      <DialogActions>
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

function TablaAlertas() {
  const { data: alertas, isLoading, isError, error } = useAlertasLapch();
  const [alertaResolver, setAlertaResolver] = useState<AlertaLapch | null>(null);

  if (isLoading) return <EstadoCarga etiqueta="Cargando alertas…" />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar las alertas'}</Alert>;
  }
  if (!alertas || alertas.length === 0) {
    return <EstadoVacio titulo="No hay alertas LAPCH registradas." icono={<ReportProblemOutlinedIcon fontSize="large" />} />;
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Número</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alertas.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.numeroAlerta}</TableCell>
                <TableCell>{new Date(a.fecha).toLocaleDateString()}</TableCell>
                <TableCell>{a.producto ?? '—'}</TableCell>
                <TableCell>
                  <EstadoChip estado={etiquetaResultado(a.resultado)} />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!!a.resultado}
                    onClick={() => setAlertaResolver(a)}
                  >
                    {a.resultado ? 'Resuelta' : 'Resolver'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <DialogoResolverAlerta alerta={alertaResolver} open={!!alertaResolver} onClose={() => setAlertaResolver(null)} />
    </>
  );
}

export default function AlertasLapch() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader etiqueta="Coordinador" titulo="Alertas LAPCH" icono={<ReportProblemOutlinedIcon />} />
      <FormularioNuevaAlerta />
      <Box>
        <Typography variant="h6" gutterBottom>
          Alertas registradas
        </Typography>
        <TablaAlertas />
      </Box>
    </Box>
  );
}
