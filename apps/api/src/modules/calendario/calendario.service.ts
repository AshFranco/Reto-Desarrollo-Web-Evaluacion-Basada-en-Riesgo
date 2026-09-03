import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CalendarioService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerCalendario(evaluadorId: string, desde?: string, hasta?: string) {
    const evaluaciones = await this.prisma.evaluacion.findMany({
      where: {
        idEvaluador: BigInt(evaluadorId),
        fechaProgramada: {
          gte: desde ? new Date(desde) : undefined,
          lte: hasta ? new Date(hasta) : undefined,
        },
      },
      select: {
        id: true,
        idEstado: true,
        fechaProgramada: true,
        establecimiento: { select: { nombre: true, calle: true } },
      },
      orderBy: { fechaProgramada: 'asc' },
    });
    return evaluaciones.map((e) => ({ ...e, id: e.id.toString() }));
  }
}
