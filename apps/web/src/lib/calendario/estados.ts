import { ID_ESTADO_EVALUACION } from '@/lib/coordinador/useCasos';

export interface InfoEstado {
  etiqueta: string;
  color: string;
}

const E = ID_ESTADO_EVALUACION;

/** Etiqueta y color de cada estado de evaluación, con el mismo criterio de colores que el resto de la app (azul de marca, ámbar en curso, verde aprobado, rojo devuelto). */
const POR_ID: Record<number, InfoEstado> = {
  [E.PROGRAMADA]: { etiqueta: 'Programada', color: '#2A6DB0' },
  [E.EN_CURSO]: { etiqueta: 'En curso', color: '#B8860B' },
  [E.FINALIZADA]: { etiqueta: 'Finalizada', color: '#6D4AA8' },
  [E.EN_REVISION]: { etiqueta: 'En revisión', color: '#8A63C2' },
  [E.APROBADA]: { etiqueta: 'Aprobada', color: '#2E7D32' },
  [E.DEVUELTA]: { etiqueta: 'Devuelta', color: '#C62828' },
  [E.CERRADA]: { etiqueta: 'Cerrada', color: '#4B5563' },
  [E.CANCELADA]: { etiqueta: 'Cancelada', color: '#9CA3AF' },
};

export function infoEstado(idEstado: number | null): InfoEstado {
  return (idEstado !== null && POR_ID[idEstado]) || { etiqueta: 'Sin estado', color: '#6B7280' };
}

export function estaCancelada(idEstado: number | null): boolean {
  return idEstado === E.CANCELADA;
}
