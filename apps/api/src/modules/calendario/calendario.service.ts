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

  /**
   * Calendario combinado del equipo completo (todos los Técnicos
   * Evaluadores), agrupado por técnico -- para que el Coordinador vea la
   * carga de trabajo de todos de un solo vistazo, en vez de pedir uno por
   * uno. Se agrega a pedido de Jorge (frontend), sin romper el uso
   * existente por técnico individual.
   */
  async obtenerCalendarioEquipo(desde?: string, hasta?: string) {
    const evaluaciones = await this.prisma.evaluacion.findMany({
      where: {
        fechaProgramada: {
          gte: desde ? new Date(desde) : undefined,
          lte: hasta ? new Date(hasta) : undefined,
        },
      },
      select: {
        id: true,
        idEstado: true,
        fechaProgramada: true,
        idEvaluador: true,
        evaluador: { select: { nombreCompleto: true } },
        establecimiento: { select: { nombre: true, calle: true } },
      },
      orderBy: { fechaProgramada: 'asc' },
    });

    const porTecnico = new Map<string, { evaluadorId: string; nombreCompleto: string; evaluaciones: any[] }>();
    for (const e of evaluaciones) {
      const key = e.idEvaluador.toString();
      if (!porTecnico.has(key)) {
        porTecnico.set(key, {
          evaluadorId: key,
          nombreCompleto: e.evaluador.nombreCompleto,
          evaluaciones: [],
        });
      }
      porTecnico.get(key)!.evaluaciones.push({
        id: e.id.toString(),
        idEstado: e.idEstado,
        fechaProgramada: e.fechaProgramada,
        establecimiento: e.establecimiento,
      });
    }

    return Array.from(porTecnico.values());
  }

  async reprogramar(evaluacionId: string, nuevaFecha: string, comentario?: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({
      where: { id: BigInt(evaluacionId) },
    });
    if (!evaluacion) throw new (require('@nestjs/common').NotFoundException)('Evaluación no encontrada.');

    const actualizada = await this.prisma.evaluacion.update({
      where: { id: BigInt(evaluacionId) },
      data: { fechaProgramada: new Date(nuevaFecha) },
    });

    return {
      mensaje: 'Evaluación reprogramada exitosamente.',
      evaluacion: { ...actualizada, id: actualizada.id.toString(), idEvaluador: actualizada.idEvaluador.toString() },
    };
  }

  async cancelar(evaluacionId: string, motivo?: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({
      where: { id: BigInt(evaluacionId) },
    });
    if (!evaluacion) throw new (require('@nestjs/common').NotFoundException)('Evaluación no encontrada.');

    const estadoCancelado = await this.prisma.estadoEvaluacion.findFirst({
      where: { codigo: { in: ['CANCELADA', 'CANCELADO'] } },
    });

    const actualizada = await this.prisma.evaluacion.update({
      where: { id: BigInt(evaluacionId) },
      data: {
        idEstado: estadoCancelado?.id ?? evaluacion.idEstado,
      },
    });

    return {
      mensaje: 'Cita de evaluación cancelada exitosamente.',
      evaluacion: { ...actualizada, id: actualizada.id.toString(), idEvaluador: actualizada.idEvaluador.toString() },
    };
  }
}
