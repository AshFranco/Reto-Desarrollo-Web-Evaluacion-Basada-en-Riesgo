import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import { useCasosHistorico } from '@/lib/historico/useCasosHistorico';
import { useEmpresas } from '@/lib/empresa/useEmpresas';
import { getSession } from '@/lib/auth/session';
import type { UsuarioLocal, FiltrosCasosHistorico } from '@/lib/types';

/**
 * Mismo criterio que el backend (casos.service.ts): estos roles ven todo
 * el historial y pueden elegir qué empresa filtrar. Los demás (Empresa,
 * Usuario Delegado) solo ven la suya — el servidor la fuerza server-side
 * e ignora cualquier empresaId que intenten mandar, así que no tiene
 * sentido mostrarles el selector.
 */
const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];

/** Valores reales de caso.estado confirmados en vivo — no la lista vieja del DTO, que nunca coincidió con datos reales. */
const ESTADOS: FiltrosCasosHistorico['estado'][] = ['Pendiente', 'Asignado', 'Cerrado'];

const FILTROS_VACIOS: FiltrosCasosHistorico = {};

export default function ConsultaHistorica() {
  const [usuario, setUsuario] = useState<UsuarioLocal | null>(null);

  useEffect(() => {
    let cancelado = false;
    getSession().then((sesion) => {
      if (!cancelado) setUsuario(sesion?.usuario ?? null);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const esRolInterno = !!usuario && ROLES_INTERNOS.includes(usuario.rol);
  const { data: empresas } = useEmpresas();

  const [filtros, setFiltros] = useState<FiltrosCasosHistorico>(FILTROS_VACIOS);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosCasosHistorico>(FILTROS_VACIOS);

  const { data: casos, isLoading, isError, error } = useCasosHistorico(filtrosAplicados);

  function actualizar<K extends keyof FiltrosCasosHistorico>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: (valor || undefined) as FiltrosCasosHistorico[K] }));
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4">Consulta histórica de casos</Typography>

      <Paper variant="outlined" sx={{ padding: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {esRolInterno && (
            <TextField
              select
              label="Empresa"
              size="small"
              sx={{ minWidth: 220 }}
              value={filtros.empresaId ?? ''}
              onChange={(e) => actualizar('empresaId', e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {(empresas ?? []).map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.razonSocial}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="ID de solicitud"
            size="small"
            value={filtros.solicitudId ?? ''}
            onChange={(e) => actualizar('solicitudId', e.target.value)}
          />

          <TextField
            label="ID de evaluación"
            size="small"
            value={filtros.evaluacionId ?? ''}
            onChange={(e) => actualizar('evaluacionId', e.target.value)}
          />

          <TextField
            select
            label="Estado"
            size="small"
            sx={{ minWidth: 160 }}
            value={filtros.estado ?? ''}
            onChange={(e) => actualizar('estado', e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {ESTADOS.map((estado) => (
              <MenuItem key={estado} value={estado}>
                {estado}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Creado desde"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filtros.fechaCreacionDesde ?? ''}
            onChange={(e) => actualizar('fechaCreacionDesde', e.target.value)}
          />

          <TextField
            label="Creado hasta"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filtros.fechaCreacionHasta ?? ''}
            onChange={(e) => actualizar('fechaCreacionHasta', e.target.value)}
          />

          <Button variant="contained" onClick={() => setFiltrosAplicados(filtros)}>
            Buscar
          </Button>
          <Button
            variant="text"
            onClick={() => {
              setFiltros(FILTROS_VACIOS);
              setFiltrosAplicados(FILTROS_VACIOS);
            }}
          >
            Limpiar
          </Button>
        </Box>
      </Paper>

      {isLoading && <CircularProgress size={24} />}
      {isError && (
        <Alert severity="error">{error instanceof Error ? error.message : 'Error al buscar en el histórico'}</Alert>
      )}
      {!isLoading && !isError && casos && casos.length === 0 && (
        <Typography color="text.secondary">No se encontraron casos con esos filtros.</Typography>
      )}
      {!isLoading && !isError && casos && casos.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Empresa</TableCell>
                <TableCell>Establecimiento</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha de creación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {casos.map((caso) => (
                <TableRow key={caso.id}>
                  <TableCell>{caso.establecimiento.empresa.razonSocial}</TableCell>
                  <TableCell>{caso.establecimiento.nombre}</TableCell>
                  <TableCell>{caso.origen?.nombre ?? '—'}</TableCell>
                  <TableCell>{caso.estado}</TableCell>
                  <TableCell>{new Date(caso.fechaCreacion).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
