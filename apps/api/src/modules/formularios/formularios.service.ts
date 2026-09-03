import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Adaptado: la ficha ya no tiene tablas separadas Sección/Ítem -- ambas
 * viven en `item_ficha` con jerarquía auto-referenciada (`id_padre`).
 * Se arma el árbol en memoria a partir de la lista plana.
 */
@Injectable()
export class FormulariosService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerVigente() {
    const version = await this.prisma.versionFicha.findFirst({
      where: { estado: 'Activa' },
      orderBy: { fechaVigenciaDesde: 'desc' },
    });
    if (!version) throw new NotFoundException('No hay una versión vigente del formulario.');

    const items = await this.prisma.itemFicha.findMany({
      where: { idVersionFicha: version.id, activo: true },
      orderBy: [{ orden: 'asc' }],
    });
    const opciones = await this.prisma.opcionRespuesta.findMany({
      where: { idVersionFicha: version.id },
    });

    const porId = new Map(items.map((i) => [i.id.toString(), { ...i, id: i.id.toString(), idPadre: i.idPadre?.toString() ?? null, hijos: [] as any[] }]));
    const raices: any[] = [];
    for (const nodo of porId.values()) {
      if (nodo.idPadre && porId.has(nodo.idPadre)) {
        porId.get(nodo.idPadre)!.hijos.push(nodo);
      } else {
        raices.push(nodo);
      }
    }

    return {
      ...version,
      id: version.id.toString(),
      secciones: raices,
      opcionesRespuesta: opciones.map((o) => ({ ...o, id: o.id.toString() })),
    };
  }
}
