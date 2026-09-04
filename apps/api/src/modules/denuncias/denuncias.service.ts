import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearDenunciaDto, ResolverDenunciaDto } from './dto/denuncia.dto';

@Injectable()
export class DenunciasService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(dto: CrearDenunciaDto) {
    const denuncia = await this.prisma.denuncia.create({
      data: {
        tipoDenuncia: dto.tipoDenuncia,
        fechaRecepcion: new Date(dto.fechaRecepcion),
        denunciante: dto.denunciante,
        descripcion: dto.descripcion,
        idEmpresa: dto.empresaId ? BigInt(dto.empresaId) : undefined,
        idEstablecimiento: dto.establecimientoId ? BigInt(dto.establecimientoId) : undefined,
      },
    });
    return this.serializar(denuncia);
  }

  async resolver(id: string, dto: ResolverDenunciaDto) {
    const denuncia = await this.prisma.denuncia.findUnique({ where: { id: BigInt(id) } });
    if (!denuncia) throw new NotFoundException('Denuncia no encontrada.');
    if (denuncia.resultado) throw new BadRequestException('Esta denuncia ya fue resuelta.');
    if (dto.resultado === 'PROCEDE' && !denuncia.idEstablecimiento) {
      throw new BadRequestException('La denuncia debe tener un establecimiento asociado para generar el caso.');
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.denuncia.update({
        where: { id: BigInt(id) },
        data: { resultado: dto.resultado },
      });

      if (dto.resultado === 'PROCEDE') {
        const origen = await tx.origenCaso.findUniqueOrThrow({ where: { codigo: 'DENUNCIA' } });
        await tx.caso.create({
          data: {
            idEstablecimiento: denuncia.idEstablecimiento!,
            idOrigen: origen.id,
            idDenuncia: BigInt(id),
          },
        });
      }
      return this.serializar(actualizada);
    });
  }

  async listar() {
    const denuncias = await this.prisma.denuncia.findMany({ orderBy: { fechaRecepcion: 'desc' } });
    return denuncias.map((d) => this.serializar(d));
  }

  private serializar(d: any) {
    return {
      ...d,
      id: d.id.toString(),
      idEmpresa: d.idEmpresa?.toString() ?? null,
      idEstablecimiento: d.idEstablecimiento?.toString() ?? null,
    };
  }
}
