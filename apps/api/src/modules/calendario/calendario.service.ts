import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class CalendarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

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
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');

    const actualizada = await this.prisma.evaluacion.update({
      where: { id: BigInt(evaluacionId) },
      data: { fechaProgramada: new Date(nuevaFecha) },
    });

    await this.notificaciones.crear({
      idUsuario: actualizada.idEvaluador,
      tipo: 'CITA_REPROGRAMADA',
      titulo: 'Cita de evaluación reprogramada',
      mensaje: `Su evaluación #${evaluacionId} fue reprogramada para ${actualizada.fechaProgramada?.toISOString().split('T')[0]}.${comentario ? ` Comentario: ${comentario}` : ''}`,
      entidad: 'evaluacion',
      idEntidad: actualizada.id,
    });

    return {
      mensaje: 'Evaluación reprogramada exitosamente.',
      evaluacion: { ...actualizada, id: actualizada.id.toString(), idEvaluador: actualizada.idEvaluador.toString() },
    };
  }

  async cancelar(evaluacionId: string, motivo?: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({
      where: { id: BigInt(evaluacionId) },
      include: { estado: true },
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');

    if (evaluacion.estado?.codigo !== 'PROGRAMADA') {
      throw new BadRequestException('Solo se puede cancelar una cita que esté en estado Programada.');
    }

    const estadoCancelado = await this.prisma.estadoEvaluacion.findFirst({
      where: { codigo: { in: ['CANCELADA', 'CANCELADO'] } },
    });
    if (!estadoCancelado) {
      throw new InternalServerErrorException(
        'No existe el estado CANCELADA en el catálogo estado_evaluacion. Ejecute el seed antes de cancelar.',
      );
    }

    const actualizada = await this.prisma.evaluacion.update({
      where: { id: BigInt(evaluacionId) },
      data: {
        idEstado: estadoCancelado.id,
      },
    });

    await this.notificaciones.crear({
      idUsuario: actualizada.idEvaluador,
      tipo: 'CITA_CANCELADA',
      titulo: 'Cita de evaluación cancelada',
      mensaje: `Su evaluación #${evaluacionId} fue cancelada.${motivo ? ` Motivo: ${motivo}` : ''}`,
      entidad: 'evaluacion',
      idEntidad: actualizada.id,
    });

    return {
      mensaje: 'Cita de evaluación cancelada exitosamente.',
      evaluacion: { ...actualizada, id: actualizada.id.toString(), idEvaluador: actualizada.idEvaluador.toString() },
    };
  }
}
