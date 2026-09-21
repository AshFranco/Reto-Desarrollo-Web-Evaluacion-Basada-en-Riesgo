import type { FilaNoConformidad, GravedadNoConformidad, ResultadoDestacadoPdf } from '../services/pdf.service';

/** NivelCriticidad.codigo -> gravedad del PDF (confirmado contra el seed: C=Crítica, M=Mayor, Me=Menor). */
const GRAVEDAD_POR_CODIGO_CRITICIDAD: Record<string, GravedadNoConformidad> = {
  C: 'CRITICA',
  M: 'MAYOR',
  Me: 'MENOR',
};

const CALIFICACION_POR_CODIGO: Record<string, string> = {
  CP: 'No cumple parcial',
  IT: 'No cumple',
  NC: 'No cumple',
  C: 'Cumple',
  NA: 'No aplica',
};

export interface CalculoRiesgoParaPdf {
  porcentajeCumplimiento: unknown;
  ncCriticas: number;
  ncMayores: number;
  ncMenores: number;
  riesgoTotal?: unknown;
  aprueba: boolean | null;
  frecuencia: string | null;
  nivelRiesgo: { nombre: string } | null;
}

export interface RespuestaParaPdf {
  itemFicha: { numeracion?: string | null; titulo: string };
  opcionRespuesta: { codigo: string; generaNc: boolean };
  criticidad: { codigo: string } | null;
  observacion: string | null;
}

/**
 * Confirmado contra motor-riesgo.service.ts: CalculoRiesgo ya trae
 * porcentajeCumplimiento, ncCriticas/Mayores/Menores, aprueba y frecuencia
 * calculados por el motor -- no hay que re-derivarlos acá, solo mapearlos a
 * la forma que espera PdfService.
 */
export function mapearResultadoDestacado(
  calculoRiesgo: CalculoRiesgoParaPdf | null | undefined,
): ResultadoDestacadoPdf | undefined {
  if (!calculoRiesgo || calculoRiesgo.porcentajeCumplimiento == null) return undefined;

  const pct = Number(calculoRiesgo.porcentajeCumplimiento);
  const rt = calculoRiesgo.riesgoTotal != null ? Number(calculoRiesgo.riesgoTotal).toFixed(2) : undefined;
  const nivelNombre = calculoRiesgo.nivelRiesgo?.nombre?.toUpperCase() ?? 'BAJO';

  return {
    cumplimientoPct: pct,
    ncCriticas: calculoRiesgo.ncCriticas,
    ncMayores: calculoRiesgo.ncMayores,
    ncMenores: calculoRiesgo.ncMenores,
    nivelRiesgo: rt ? `${nivelNombre} (${rt})` : nivelNombre,
    frecuencia: calculoRiesgo.frecuencia ?? undefined,
    aprueba: !!calculoRiesgo.aprueba,
  };
}

/**
 * Fila de la tabla de no conformidades por cada respuesta que realmente
 * generó una NC. Traduce códigos (CP -> No cumple parcial, IT -> No cumple)
 * y concatena la numeración del ítem para coincidir con la Ficha Oficial.
 */
export function mapearNoConformidades(respuestas: RespuestaParaPdf[]): FilaNoConformidad[] {
  return respuestas
    .filter((r) => r.opcionRespuesta.generaNc)
    .map((r) => {
      const numPrefix = r.itemFicha.numeracion ? `${r.itemFicha.numeracion} ` : '';
      const califTexto = CALIFICACION_POR_CODIGO[r.opcionRespuesta.codigo] || r.opcionRespuesta.codigo;
      const obsTexto = r.observacion && r.observacion.trim() !== '' && !r.observacion.startsWith('Sin ')
        ? r.observacion.trim()
        : 'Se requiere subsanación técnica en el plazo reglamentario.';

      return {
        item: numPrefix + r.itemFicha.titulo,
        gravedad: (r.criticidad ? GRAVEDAD_POR_CODIGO_CRITICIDAD[r.criticidad.codigo] : undefined) ?? 'MENOR',
        calificacion: califTexto,
        observacion: obsTexto,
      };
    });
}
