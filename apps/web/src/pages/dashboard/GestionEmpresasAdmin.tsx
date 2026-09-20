import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { useEmpresas, useCrearEmpresa, useEditarEmpresa, type DatosEmpresa } from '@/lib/empresa/useEmpresas';
import { EMPRESA_VACIA, validarEmpresa, type ErroresEmpresa } from '@/lib/empresa/validacionEmpresa';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import type { Empresa } from '@/lib/types';

function DialogoEmpresa({ empresa, open, onClose }: { empresa: Empresa | null; open: boolean; onClose: () => void }) {
  const crear = useCrearEmpresa();
  const editar = useEditarEmpresa(empresa?.id ?? '');
  const [datos, setDatos] = useState<DatosEmpresa>(EMPRESA_VACIA);
  const [errores, setErrores] = useState<ErroresEmpresa>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDatos(
      empresa
        ? {
            razonSocial: empresa.razonSocial,
            rnc: empresa.rnc,
            nombreComercial: empresa.nombreComercial ?? '',
            direccion: empresa.direccion ?? '',
            telefono: empresa.telefono ?? '',
            correo: empresa.correo ?? '',
            actividadEconomica: empresa.actividadEconomica ?? '',
          }
        : EMPRESA_VACIA
    );
    setErrores({});
    setError(null);
  }, [open, empresa]);

  const pendiente = crear.isPending || editar.isPending;

  function actualizarCampo<K extends keyof DatosEmpresa>(campo: K, valor: string) {
    const nuevos = { ...datos, [campo]: valor };
    setDatos(nuevos);
    setErrores(validarEmpresa(nuevos));
  }

  async function guardar() {
    const errs = validarEmpresa(datos);
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    setError(null);
    try {
      if (empresa) await editar.mutateAsync(datos);
      else await crear.mutateAsync(datos);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la empresa');
    }
  }

  return (
    <Dialog open={open} onClose={pendiente ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{empresa ? 'Editar empresa' : 'Registrar nueva empresa'}</DialogTitle>
      <DialogContent>
        {!empresa && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            La empresa quedará disponible en el catálogo público para que sus representantes puedan registrarse.
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Razón social"
          fullWidth
          required
          margin="dense"
          value={datos.razonSocial}
          onChange={(e) => actualizarCampo('razonSocial', e.target.value)}
          disabled={pendiente}
        />
        <TextField
          label="RNC"
          fullWidth
          required
          margin="dense"
          value={datos.rnc}
          onChange={(e) => actualizarCampo('rnc', e.target.value)}
          disabled={pendiente}
          error={Boolean(errores.rnc)}
          helperText={errores.rnc ?? 'Solo números, de 9 o de 11 dígitos, sin signos.'}
        />
        <TextField
          label="Nombre comercial"
          fullWidth
          margin="dense"
          value={datos.nombreComercial}
          onChange={(e) => actualizarCampo('nombreComercial', e.target.value)}
          disabled={pendiente}
        />
        <TextField
          label="Dirección"
          fullWidth
          margin="dense"
          value={datos.direccion}
          onChange={(e) => actualizarCampo('direccion', e.target.value)}
          disabled={pendiente}
        />
        <TextField
          label="Teléfono"
          fullWidth
          margin="dense"
          value={datos.telefono}
          onChange={(e) => actualizarCampo('telefono', e.target.value)}
          disabled={pendiente}
          error={Boolean(errores.telefono)}
          helperText={errores.telefono ?? '10 dígitos sin guiones ni signos'}
          inputProps={{ maxLength: 10 }}
        />
        <TextField
          label="Correo"
          fullWidth
          margin="dense"
          value={datos.correo}
          onChange={(e) => actualizarCampo('correo', e.target.value)}
          disabled={pendiente}
          error={Boolean(errores.correo)}
          helperText={errores.correo}
        />
        <TextField
          label="Actividad económica"
          fullWidth
          margin="dense"
          value={datos.actividadEconomica}
          onChange={(e) => actualizarCampo('actividadEconomica', e.target.value)}
          disabled={pendiente}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pendiente}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={guardar}
          disabled={pendiente || !datos.razonSocial.trim() || !datos.rnc.trim() || Object.keys(errores).length > 0}
        >
          {pendiente ? <CircularProgress size={20} /> : empresa ? 'Guardar cambios' : 'Registrar empresa'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** CU-04 "Gestionar empresa" (Administrador): alta y edición del catálogo de empresas titulares. */
export function GestionEmpresasAdmin() {
  const { data: empresas, isLoading, isError, error } = useEmpresas();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [empresaEditar, setEmpresaEditar] = useState<Empresa | null>(null);

  function abrirNueva() {
    setEmpresaEditar(null);
    setDialogoAbierto(true);
  }

  function abrirEditar(empresa: Empresa) {
    setEmpresaEditar(empresa);
    setDialogoAbierto(true);
  }

  if (isLoading) return <EstadoCarga />;
  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Error al cargar las empresas'}</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Catálogo de empresas titulares. Una empresa debe existir aquí antes de que sus representantes puedan
          registrarse.
        </Typography>
        <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={abrirNueva}>
          Nueva empresa
        </Button>
      </Box>

      {!empresas || empresas.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay empresas registradas." icono={<BusinessOutlinedIcon fontSize="large" />} />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Razón social</TableCell>
                <TableCell>RNC</TableCell>
                <TableCell>Nombre comercial</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Correo</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {empresas.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{e.razonSocial}</TableCell>
                  <TableCell>{e.rnc}</TableCell>
                  <TableCell>{e.nombreComercial ?? '—'}</TableCell>
                  <TableCell>{e.telefono ?? '—'}</TableCell>
                  <TableCell>{e.correo ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar empresa">
                      <IconButton
                        size="small"
                        aria-label={`Editar ${e.razonSocial}`}
                        onClick={() => abrirEditar(e)}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <DialogoEmpresa empresa={empresaEditar} open={dialogoAbierto} onClose={() => setDialogoAbierto(false)} />
    </Box>
  );
}
