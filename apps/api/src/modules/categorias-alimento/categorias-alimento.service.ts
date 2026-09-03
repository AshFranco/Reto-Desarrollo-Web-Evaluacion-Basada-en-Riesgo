import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AsignarCategoriaDto } from './dto/categoria-alimento.dto';

@Injectable()
export class CategoriasAlimentoService {
  constructor(private readonly prisma: PrismaService) {}

  async listarCatalogo() {
    const categorias = await this.prisma.categoriaAlimento.findMany({
      include: { subcategorias: { include: { nivelResultante: true } } },
      orderBy: { nombre: 'asc' },
    });
    return categorias.map((c) => ({
      ...c,
      id: c.id.toString(),
      subcategorias: c.subcategorias.map((s) => ({ ...s, id: s.id.toString(), idCategoria: s.idCategoria.toString() })),
    }));
  }

  async asignarAEstablecimiento(dto: AsignarCategoriaDto) {
    const [establecimiento, subcategoria] = await Promise.all([
      this.prisma.establecimiento.findUnique({ where: { id: BigInt(dto.establecimientoId) } }),
      this.prisma.subcategoriaAlimento.findUnique({ where: { id: BigInt(dto.subcategoriaId) } }),
    ]);
    if (!establecimiento) throw new BadRequestException('Establecimiento no encontrado.');
    if (!subcategoria) throw new BadRequestException('Subcategoría de alimento no encontrada.');

    const existente = await this.prisma.establecimientoCategoria.findFirst({
      where: { idEstablecimiento: establecimiento.id, idSubcategoriaAlimento: subcategoria.id },
    });
    if (existente) return { ...existente, id: existente.id.toString() };

    const creado = await this.prisma.establecimientoCategoria.create({
      data: { idEstablecimiento: establecimiento.id, idSubcategoriaAlimento: subcategoria.id },
    });
    return { ...creado, id: creado.id.toString() };
  }

  async categoriasDeEstablecimiento(establecimientoId: string) {
    const categorias = await this.prisma.establecimientoCategoria.findMany({
      where: { idEstablecimiento: BigInt(establecimientoId) },
      include: { subcategoria: { include: { categoria: true, nivelResultante: true } } },
    });
    return categorias.map((c) => ({ ...c, id: c.id.toString() }));
  }
}
