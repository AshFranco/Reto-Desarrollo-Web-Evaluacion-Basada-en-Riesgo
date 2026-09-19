import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AsignarEvaluadorDto } from './dto/asignar-evaluador.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class AsignacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * RF-10: asigna (o reasigna) un evaluador a un caso. Además, crea la
   * Evaluacion asociada si el caso todavía no tiene una -- es el punto
   * natural del flujo donde ya se conocen caso + evaluador + establecimiento,
   * y habilita RF-11 (calendario) y RF-12 (ejecución) para el técnico.
   */
  async asignar(dto: AsignarEvaluadorDto, coordinadorId: string) {
    const evaluador = await this.prisma.usuario.findUnique({
      where: { id: BigInt(dto.evaluadorId) },
      include: { roles: { include: { rol: true } } },
    });
    const esEvaluador = evaluador?.roles.some((r) => r.rol.codigo === 'TECNICO_EVALUADOR');
    if (!evaluador || !esEvaluador) {
      throw new BadRequestException('El usuario indicado no es un Técnico Evaluador válido.');
    }

    const caso = await this.prisma.caso.findUnique({ where: { id: BigInt(dto.casoId) } });
    if (!caso) throw new NotFoundException('Caso no encontrado.');

    const versionFicha = await this.prisma.versionFicha.findFirst({ where: { estado: 'Activa' } });
    const versionMatriz = await this.prisma.versionMatrizRiesgo.findFirst({ where: { estado: 'Activa' } });
    if (!versionFicha || !versionMatriz) {
      throw new BadRequestException('No hay una versión activa de la ficha o de la matriz de riesgo.');
    }

    const estadoProgramada = await this.prisma.estadoEvaluacion.findUnique({ where: { codigo: 'PROGRAMADA' } });

    return this.prisma.$transaction(async (tx) => {
      // No hay flag "activa" en el esquema oficial; se marca la anterior
      // como "Reasignada" para dejar solo una asignación "Asignado" vigente.
      await tx.asignacionEvaluador.updateMany({
        where: { idCaso: BigInt(dto.casoId), estado: 'Asignado' },
        data: { estado: 'Reasignada' },
      });

      const asignacion = await tx.asignacionEvaluador.create({
        data: {
          idCaso: BigInt(dto.casoId),
          idEvaluador: BigInt(dto.evaluadorId),
          idCoordinador: BigInt(coordinadorId),
          estado: 'Asignado',
        },
      });

      await tx.caso.update({ where: { id: BigInt(dto.casoId) }, data: { estado: 'Asignado' } });

      // Crea la Evaluacion si el caso no tenía una todavía. Si ya existía
      // (ej. una reasignación), solo se actualiza el evaluador.
      let evaluacion = await tx.evaluacion.findFirst({ where: { idCaso: BigInt(dto.casoId) } });
      if (!evaluacion) {
        evaluacion = await tx.evaluacion.create({
          data: {
            idCaso: BigInt(dto.casoId),
            idEstablecimiento: caso.idEstablecimiento,
            idVersionFicha: versionFicha.id,
            idVersionMatriz: versionMatriz.id,
            idEvaluador: BigInt(dto.evaluadorId),
            idEstado: estadoProgramada?.id,
          },
        });
      } else if (evaluacion.idEvaluador !== BigInt(dto.evaluadorId)) {
        evaluacion = await tx.evaluacion.update({
          where: { id: evaluacion.id },
          data: { idEvaluador: BigInt(dto.evaluadorId) },
        });
      }

      return {
        ...asignacion,
        id: asignacion.id.toString(),
        idCaso: asignacion.idCaso.toString(),
        evaluacionId: evaluacion.id.toString(),
      };
    }).then(async (resultado) => {
      await this.notificaciones.crear({
        idUsuario: dto.evaluadorId,
        tipo: 'ASIGNACION_EVALUACION',
        titulo: 'Nueva evaluación asignada',
        mensaje: `Se le asignó una evaluación para el caso #${dto.casoId}.`,
        entidad: 'evaluacion',
        idEntidad: resultado.evaluacionId,
      });
      return resultado;
    });
  }

  /**
   * Desasigna el evaluador de un caso (cancela la asignación activa y
   * regresa el estado del caso a Pendiente).
   */
  async desasignar(casoId: string) {
    const caso = await this.prisma.caso.findUnique({ where: { id: BigInt(casoId) } });
    if (!caso) throw new NotFoundException('Caso no encontrado.');
    if (caso.estado === 'Cerrado') throw new BadRequestException('No se puede desasignar un caso cerrado.');

    return this.prisma.$transaction(async (tx) => {
      await tx.asignacionEvaluador.updateMany({
        where: { idCaso: BigInt(casoId), estado: 'Asignado' },
        data: { estado: 'Cancelada' },
      });

      await tx.caso.update({
        where: { id: BigInt(casoId) },
        data: { estado: 'Pendiente' },
      });

      const estadoProgramada = await tx.estadoEvaluacion.findUnique({ where: { codigo: 'PROGRAMADA' } });
      if (estadoProgramada) {
        await tx.evaluacion.deleteMany({
          where: { idCaso: BigInt(casoId), idEstado: estadoProgramada.id },
        });
      }

      return { mensaje: 'Técnico desasignado correctamente.' };
    });
  }


  /**
   * RF-11 (Calendario)/RF-12 (Ejecución): el Técnico necesita el
   * `evaluacionId` de cada asignación para poder navegar directo a
   * "iniciar" su evaluación desde la lista, sin un paso intermedio.
   */
  async listarPorEvaluador(evaluadorId: string) {
    const asignaciones = await this.prisma.asignacionEvaluador.findMany({
      where: { idEvaluador: BigInt(evaluadorId), estado: 'Asignado' },
      include: { caso: { include: { establecimiento: { select: { nombre: true, calle: true } } } } },
      orderBy: { fechaAsignacion: 'desc' },
    });

    // Una consulta para traer todas las evaluaciones de estos casos de una
    // vez (evita N+1: una query por cada asignación en un loop).
    const idsCaso = asignaciones.map((a) => a.idCaso);
    const evaluaciones = await this.prisma.evaluacion.findMany({
      where: { idCaso: { in: idsCaso } },
      select: {
        id: true,
        idCaso: true,
        estado: { select: { codigo: true } },
      },
    });
    const evaluacionPorCaso = new Map(
      evaluaciones.map((e) => [
        e.idCaso.toString(),
        { id: e.id.toString(), estadoCodigo: e.estado?.codigo ?? null },
      ]),
    );

    return asignaciones.map((a) => {
      const ev = evaluacionPorCaso.get(a.idCaso.toString());
      return {
        ...a,
        id: a.id.toString(),
        idCaso: a.idCaso.toString(),
        evaluacionId: ev ? ev.id : null,
        evaluacionEstado: ev ? ev.estadoCodigo : null,
      };
    });
  }
}
