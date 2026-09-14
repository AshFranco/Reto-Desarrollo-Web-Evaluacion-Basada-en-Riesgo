import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useCasosHistorico } from '@/lib/historico/useCasosHistorico';
import { useEmpresas } from '@/lib/empresa/useEmpresas';
import { getSession } from '@/lib/auth/session';
import type { UsuarioLocal, FiltrosCasosHistorico } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { ModalInspeccionCaso } from '@/components/casos/ModalInspeccionCaso';


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
  const [casoAInspeccionar, setCasoAInspeccionar] = useState<string | null>(null);

  const { data: casos, isLoading, isError, error } = useCasosHistorico(filtrosAplicados);


  const fechasInvertidas = Boolean(
    filtros.fechaCreacionDesde &&
      filtros.fechaCreacionHasta &&
      filtros.fechaCreacionDesde > filtros.fechaCreacionHasta
  );

  function actualizar<K extends keyof FiltrosCasosHistorico>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: (valor || undefined) as FiltrosCasosHistorico[K] }));
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader etiqueta="Historial" titulo="Consulta histórica de casos" icono={<HistoryOutlinedIcon />} />

      <Paper variant="outlined" sx={{ padding: 2 }}>
        {/* alignItems: 'flex-start' evita que un helperText en un campo
            haga saltar los demás inputs hacia arriba. */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
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
            label="Identificación de solicitud"
            size="small"
            value={filtros.solicitudId ?? ''}
            onChange={(e) => actualizar('solicitudId', e.target.value)}
          />

          <TextField
            label="Identificación de evaluación"
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
            error={fechasInvertidas}
          />

          <TextField
            label="Creado hasta"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filtros.fechaCreacionHasta ?? ''}
            onChange={(e) => actualizar('fechaCreacionHasta', e.target.value)}
            error={fechasInvertidas}
          />

          <Button
            variant="contained"
            disabled={fechasInvertidas}
            onClick={() => {
              if (fechasInvertidas) return;
              setFiltrosAplicados(filtros);
            }}
          >
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
        {fechasInvertidas && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            El rango de fechas es inválido: "Creado desde" no puede ser posterior a "Creado hasta".
          </Alert>
        )}
      </Paper>

      {isLoading && <EstadoCarga etiqueta="Buscando en el histórico…" />}
      {isError && (
        <Alert severity="error">{error instanceof Error ? error.message : 'Error al buscar en el histórico'}</Alert>
      )}
      {!isLoading && !isError && casos && casos.length === 0 && (
        <EstadoVacio titulo="No se encontraron casos con esos filtros." icono={<SearchOffOutlinedIcon fontSize="large" />} />
      )}
      {!isLoading && !isError && casos && casos.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Caso #</TableCell>
                <TableCell>Empresa</TableCell>
                <TableCell>Establecimiento</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell>Solicitud</TableCell>
                <TableCell>Evaluación</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha de creación</TableCell>
                <TableCell align="right">Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {casos.map((caso) => (
                <TableRow key={caso.id}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {caso.id}
                    </Typography>
                  </TableCell>
                  <TableCell>{caso.establecimiento.empresa.razonSocial}</TableCell>
                  <TableCell>{caso.establecimiento.nombre}</TableCell>
                  <TableCell>{caso.origen?.nombre ?? '—'}</TableCell>
                  <TableCell>
                    {caso.solicitud?.id ? (
                      <Typography variant="body2" fontFamily="monospace">
                        {caso.solicitud.id}
                      </Typography>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {caso.evaluaciones && caso.evaluaciones.length > 0 ? (
                      <Typography variant="body2" fontFamily="monospace">
                        {caso.evaluaciones[0]?.id}
                      </Typography>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <EstadoChip estado={caso.estado} />
                  </TableCell>
                  <TableCell>{new Date(caso.fechaCreacion).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => setCasoAInspeccionar(caso.id)}
                    >
                      Inspeccionar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ModalInspeccionCaso
        casoId={casoAInspeccionar}
        open={Boolean(casoAInspeccionar)}
        onClose={() => setCasoAInspeccionar(null)}
      />
    </Box>
  );
}

