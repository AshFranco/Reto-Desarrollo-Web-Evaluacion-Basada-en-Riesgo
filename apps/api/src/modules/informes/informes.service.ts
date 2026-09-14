import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerarInformeDto, RevisarInformeDto } from './dto/informe.dto';

@Injectable()
export class InformesService {
  constructor(private readonly prisma: PrismaService) {}

  async generar(dto: GenerarInformeDto, tecnicoId: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({ where: { id: BigInt(dto.evaluacionId) } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');
    if (evaluacion.idEvaluador.toString() !== tecnicoId) {
      throw new ForbiddenException('Esta evaluación no está asignada a usted.');
    }

    const estadoFinalizada = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'FINALIZADA' } });
    if (evaluacion.idEstado !== estadoFinalizada.id) {
      throw new BadRequestException('Solo se puede generar el informe de una evaluación finalizada.');
    }

    const informe = await this.prisma.informeEvaluacion.upsert({
      where: { idEvaluacion: BigInt(dto.evaluacionId) },
      create: {
        idEvaluacion: BigInt(dto.evaluacionId),
        resumenEjecutivo: dto.resumenEjecutivo,
        hallazgos: dto.hallazgos,
        noConformidades: dto.noConformidades,
        recomendaciones: dto.recomendaciones,
      },
      update: {
        resumenEjecutivo: dto.resumenEjecutivo,
        hallazgos: dto.hallazgos,
        noConformidades: dto.noConformidades,
        recomendaciones: dto.recomendaciones,
      },
    });

    const estadoEnRevision = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'EN_REVISION' } });
    await this.prisma.evaluacion.update({
      where: { id: BigInt(dto.evaluacionId) },
      data: { idEstado: estadoEnRevision.id },
    });

    return { ...informe, id: informe.id.toString(), idEvaluacion: informe.idEvaluacion.toString() };
  }

  /**
   * NOTA sobre DEVOLVER vs SOLICITAR_CORRECCION: el catálogo estado_evaluacion
   * no tiene un estado separado para "en corrección" -- ambas acciones
   * llevan a la evaluación al mismo estado DEVUELTA. Para que el frontend
   * pueda distinguir cuál de las dos eligió el Coordinador (sin tocar el
   * catálogo ni el esquema), se guarda la acción real como prefijo del
   * comentario en historial_estado, y se devuelve explícita en la
   * respuesta de este endpoint.
   */
  async revisar(evaluacionId: string, dto: RevisarInformeDto, coordinadorId: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({ where: { id: BigInt(evaluacionId) } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');

    const estadoEnRevision = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'EN_REVISION' } });
    if (evaluacion.idEstado !== estadoEnRevision.id) {
      throw new BadRequestException('La evaluación no está en revisión.');
    }

    const nuevoEstadoCodigo = dto.accion === 'APROBAR' ? 'APROBADA' : 'DEVUELTA';
    const nuevoEstado = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: nuevoEstadoCodigo } });

    const comentarioConAccion = `[${dto.accion}] ${dto.observaciones ?? ''}`.trim();

    return this.prisma.$transaction(async (tx) => {
      await tx.historialEstado.create({
        data: {
          idEvaluacion: BigInt(evaluacionId),
          idEstadoOrigen: estadoEnRevision.id,
          idEstadoDestino: nuevoEstado.id,
          idUsuario: BigInt(coordinadorId),
          comentario: comentarioConAccion,
        },
      });

      const actualizada = await tx.evaluacion.update({
        where: { id: BigInt(evaluacionId) },
        data: { idEstado: nuevoEstado.id, idCoordinador: BigInt(coordinadorId), fechaRevision: new Date() },
      });
      return { ...actualizada, id: actualizada.id.toString(), accion: dto.accion };
    });
  }

  async revertirRevision(evaluacionId: string, coordinadorId: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({ where: { id: BigInt(evaluacionId) } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');

    const estadoDevuelta = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'DEVUELTA' } });
    const estadoEnRevision = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'EN_REVISION' } });

    if (evaluacion.idEstado !== estadoDevuelta.id) {
      throw new BadRequestException('Solo se puede revertir una evaluación que esté en estado Devuelta.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.historialEstado.create({
        data: {
          idEvaluacion: BigInt(evaluacionId),
          idEstadoOrigen: estadoDevuelta.id,
          idEstadoDestino: estadoEnRevision.id,
          idUsuario: BigInt(coordinadorId),
          comentario: '[DESHACER_DEVOLUCION] Reversión de devolución a estado En Revisión.',
        },
      });

      const actualizada = await tx.evaluacion.update({
        where: { id: BigInt(evaluacionId) },
        data: { idEstado: estadoEnRevision.id },
      });

      return {
        ...actualizada,
        id: actualizada.id.toString(),
        mensaje: 'Devolución revertida exitosamente a En Revisión.',
      };
    });
  }
}
