import type { FilaNoConformidad, GravedadNoConformidad, ResultadoDestacadoPdf } from '../services/pdf.service';

/** NivelCriticidad.codigo -> gravedad del PDF (confirmado contra el seed: C=Crítica, M=Mayor, Me=Menor). */
const GRAVEDAD_POR_CODIGO_CRITICIDAD: Record<string, GravedadNoConformidad> = {
  C: 'CRITICA',
  M: 'MAYOR',
  Me: 'MENOR',
};

export interface CalculoRiesgoParaPdf {
  porcentajeCumplimiento: unknown;
  ncCriticas: number;
  ncMayores: number;
  ncMenores: number;
  aprueba: boolean | null;
  frecuencia: string | null;
  nivelRiesgo: { nombre: string } | null;
}

export interface RespuestaParaPdf {
  itemFicha: { titulo: string };
  opcionRespuesta: { codigo: string; generaNc: boolean };
  criticidad: { codigo: string } | null;
  observacion: string | null;
}

/**
 * Confirmado contra motor-riesgo.service.ts: CalculoRiesgo ya trae
 * porcentajeCumplimiento, ncCriticas/Mayores/Menores, aprueba y frecuencia
 * calculados por el motor -- no hay que re-derivarlos acá, solo mapearlos a
 * la forma que espera PdfService. Si la evaluación todavía no tiene cálculo
 * (no finalizada / motor no corrido), devuelve undefined y el PDF
 * simplemente no dibuja la caja de resultado.
 */
export function mapearResultadoDestacado(
  calculoRiesgo: CalculoRiesgoParaPdf | null | undefined,
): ResultadoDestacadoPdf | undefined {
  if (!calculoRiesgo || calculoRiesgo.porcentajeCumplimiento == null) return undefined;

  return {
    cumplimientoPct: Number(calculoRiesgo.porcentajeCumplimiento),
    ncCriticas: calculoRiesgo.ncCriticas,
    ncMayores: calculoRiesgo.ncMayores,
    ncMenores: calculoRiesgo.ncMenores,
    nivelRiesgo: calculoRiesgo.nivelRiesgo?.nombre ?? 'N/A',
    frecuencia: calculoRiesgo.frecuencia ?? undefined,
    aprueba: !!calculoRiesgo.aprueba,
  };
}

/**
 * Fila de la tabla de no conformidades por cada respuesta que realmente
 * generó una NC -- se usa `opcionRespuesta.generaNc` (el flag real del
 * catálogo) en vez de comparar códigos 'CP'/'IT' a mano, porque ese es el
 * campo que el propio esquema define para esto exactamente.
 */
export function mapearNoConformidades(respuestas: RespuestaParaPdf[]): FilaNoConformidad[] {
  return respuestas
    .filter((r) => r.opcionRespuesta.generaNc)
    .map((r) => ({
      item: r.itemFicha.titulo,
      gravedad: (r.criticidad ? GRAVEDAD_POR_CODIGO_CRITICIDAD[r.criticidad.codigo] : undefined) ?? 'MENOR',
      calificacion: r.opcionRespuesta.codigo,
      observacion: r.observacion ?? 'Sin observación registrada.',
    }));
}
