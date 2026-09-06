import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearAlertaLapchDto, ResolverAlertaLapchDto } from './dto/alerta-lapch.dto';

@Injectable()
export class AlertasLapchService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(dto: CrearAlertaLapchDto) {
    const alerta = await this.prisma.alertaLapch.create({
      data: {
        numeroAlerta: dto.numeroAlerta,
        fecha: new Date(dto.fecha),
        producto: dto.producto,
        descripcion: dto.descripcion,
        idEmpresa: dto.empresaId ? BigInt(dto.empresaId) : undefined,
        idEstablecimiento: dto.establecimientoId ? BigInt(dto.establecimientoId) : undefined,
      },
    });
    return this.serializar(alerta);
  }

  async resolver(id: string, dto: ResolverAlertaLapchDto) {
    const alerta = await this.prisma.alertaLapch.findUnique({ where: { id: BigInt(id) } });
    if (!alerta) throw new NotFoundException('Alerta no encontrada.');
    if (alerta.resultado) throw new BadRequestException('Esta alerta ya fue resuelta.');
    if (dto.resultado === 'PROCEDE' && !alerta.idEstablecimiento) {
      throw new BadRequestException('La alerta debe tener un establecimiento asociado para generar el caso.');
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.alertaLapch.update({
        where: { id: BigInt(id) },
        data: { resultado: dto.resultado },
      });

      if (dto.resultado === 'PROCEDE') {
        const origen = await tx.origenCaso.findUniqueOrThrow({ where: { codigo: 'ALERTA' } });
        await tx.caso.create({
          data: {
            idEstablecimiento: alerta.idEstablecimiento!,
            idOrigen: origen.id,
            idAlerta: id ? BigInt(id) : undefined,
            prioridad: 'ALTA',
          },
        });
      }
      return this.serializar(actualizada);
    });
  }

  async listar() {
    const alertas = await this.prisma.alertaLapch.findMany({ orderBy: { fecha: 'desc' } });
    return alertas.map((a) => this.serializar(a));
  }

  private serializar(a: any) {
    return {
      ...a,
      id: a.id.toString(),
      idEmpresa: a.idEmpresa?.toString() ?? null,
      idEstablecimiento: a.idEstablecimiento?.toString() ?? null,
    };
  }
}
