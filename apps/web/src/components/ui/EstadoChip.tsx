import { Chip } from '@mui/material';

/**
 * Sistema de colores de estado universal (no son colores de marca):
 * verde = activo/aprobado, rojo = deficiente/destructivo, ámbar =
 * pendiente/borrador. Los estados "en curso" que no encajan en ninguna de
 * las tres categorías (p.ej. "Asignado", todavía no cerrado ni pendiente)
 * quedan neutros.
 */
const MAPA_COLOR_ESTADO: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  Pendiente: 'warning',
  'Pendiente de Asignacion': 'warning',
  Borrador: 'warning',
  Devuelta: 'error',
  Rechazada: 'error',
  Rechazado: 'error',
  Cancelado: 'error',
  Cancelada: 'error',
  Cerrado: 'success',
  Cerrada: 'success',
  Aprobada: 'success',
  Aprobado: 'success',
  Asignada: 'default',
  Asignado: 'default',
  Procede: 'success',
  'No procede': 'error',
  Remisión: 'default',
};

function colorPorEstado(estado: string) {
  return MAPA_COLOR_ESTADO[estado] ?? 'default';
}

export function EstadoChip({ estado, size = 'small' }: { estado: string; size?: 'small' | 'medium' }) {
  const color = colorPorEstado(estado);
  return (
    <Chip
      size={size}
      label={estado}
      color={color === 'default' ? undefined : color}
      variant={color === 'default' ? 'outlined' : 'filled'}
    />
  );
}
