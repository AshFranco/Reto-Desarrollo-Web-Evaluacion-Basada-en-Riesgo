import { useMemo } from 'react';
import { calcularRiesgo, type EntradaCalculo, type ResultadoRiesgo } from '@ebr/risk-engine';
import type { CatalogoItemLocal, CatalogoMetaLocal, RespuestaLocal } from '@/lib/db';

interface Params {
  respuestas: RespuestaLocal[];
  /** Items del catálogo local — proveen peso e idCriticidad por ítem. */
  catalogoItems?: CatalogoItemLocal[];
  catalogoMeta: CatalogoMetaLocal | null;
  /**
   * Datos estáticos del catálogo necesarios para el cálculo completo:
   * factores (manuales + automático), RP del establecimiento, rangos y
   * regla de aprobación. Provienen de la descarga del catálogo enriquecido.
   * Mientras no estén disponibles offline el hook retorna null.
   */
  entradaCompleta?: Omit<EntradaCalculo, 'respuestas'>;
}

export function useMotorRiesgo({
  respuestas,
  catalogoItems = [],
  catalogoMeta,
  entradaCompleta,
}: Params): ResultadoRiesgo | null {
  return useMemo(() => {
    if (!respuestas.length || !catalogoMeta || !entradaCompleta) return null;

    const opcionPorCodigo = new Map(
      catalogoMeta.opcionesRespuesta.map((o) => [o.codigo, o]),
    );
    const itemPorId = new Map(catalogoItems.map((i) => [i.id, i]));

    const respuestasEngine = respuestas.flatMap((r) => {
      const item = itemPorId.get(r.itemId);
      const opcion = opcionPorCodigo.get(r.codigoOpcion);
      if (!item || !opcion) return [];
      return [
        {
          idItemFicha: Number(r.itemId),
          opcion: {
            id: Number(opcion.id),
            codigo: opcion.codigo,
            // valor/peso son Decimal en el backend y llegan como string —
            // @ebr/risk-engine los tipa como number (usa Decimal.js internamente).
            valor: Number(opcion.valor),
            excluyeDelCalculo: opcion.excluyeDelCalculo,
            generaNc: opcion.generaNc,
          },
          peso: Number(item.peso ?? 0),
          criticidad: item.idCriticidad as 'C' | 'M' | 'Me' | null,
        },
      ];
    });

    if (!respuestasEngine.length) return null;

    try {
      return calcularRiesgo({ respuestas: respuestasEngine, ...entradaCompleta });
    } catch {
      return null;
    }
  }, [respuestas, catalogoItems, catalogoMeta, entradaCompleta]);
}
