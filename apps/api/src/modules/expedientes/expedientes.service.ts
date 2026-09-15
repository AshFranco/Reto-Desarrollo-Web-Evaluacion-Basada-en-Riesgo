import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/token.service';

const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];

@Injectable()
export class ExpedientesService {
  constructor(private readonly prisma: PrismaService) {}

  async cerrar(casoId: string) {
    const caso = await this.prisma.caso.findUnique({
      where: { id: BigInt(casoId) },
      include: { evaluaciones: true, expediente: true },
    });
    if (!caso) throw new NotFoundException('Caso no encontrado.');

    const estadoAprobada = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'APROBADA' } });
    const evaluacionAprobada = caso.evaluaciones.find((e) => e.idEstado === estadoAprobada.id);
    if (!evaluacionAprobada) {
      throw new BadRequestException('El caso no tiene una evaluación aprobada por el Coordinador; no puede cerrarse.');
    }
    if (caso.expediente?.estado === 'Cerrado') {
      throw new BadRequestException('El expediente ya está cerrado.');
    }

    const calculo = await this.prisma.calculoRiesgo.findUnique({ where: { idEvaluacion: evaluacionAprobada.id } });

    return this.prisma.$transaction(async (tx) => {
      const expediente = await tx.expediente.upsert({
        where: { idCaso: BigInt(casoId) },
        create: {
          idCaso: BigInt(casoId),
          estado: 'Cerrado',
          resultadoFinal: calculo?.calificacionTexto,
          fechaCierre: new Date(),
        },
        update: {
          estado: 'Cerrado',
          resultadoFinal: calculo?.calificacionTexto,
          fechaCierre: new Date(),
        },
      });

      await tx.caso.update({ where: { id: BigInt(casoId) }, data: { estado: 'Cerrado' } });

      const estadoCerrada = await tx.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'CERRADA' } });
      await tx.evaluacion.update({ where: { id: evaluacionAprobada.id }, data: { idEstado: estadoCerrada.id } });

      return { ...expediente, id: expediente.id.toString(), idCaso: expediente.idCaso.toString() };
    });
  }

  async reabrir(casoId: string) {
    const caso = await this.prisma.caso.findUnique({
      where: { id: BigInt(casoId) },
      include: {
        evaluaciones: {
          include: { estado: true },
        },
        expediente: true,
      },
    });
    if (!caso) throw new NotFoundException('Caso no encontrado.');

    if (caso.expediente?.estado !== 'Cerrado' && caso.estado !== 'Cerrado') {
      throw new BadRequestException('El expediente no se encuentra cerrado; no puede reabrirse.');
    }

    const estadoCerrada = await this.prisma.estadoEvaluacion.findUnique({ where: { codigo: 'CERRADA' } });
    const evaluacionCerrada = caso.evaluaciones.find(
      (e) => (estadoCerrada && e.idEstado === estadoCerrada.id) || e.estado?.codigo === 'CERRADA'
    );
    const estadoAprobada = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'APROBADA' } });

    return this.prisma.$transaction(async (tx) => {
      const expediente = await tx.expediente.update({
        where: { idCaso: BigInt(casoId) },
        data: {
          estado: 'Abierto',
          fechaCierre: null,
        },
      });

      await tx.caso.update({ where: { id: BigInt(casoId) }, data: { estado: 'Asignado' } });

      if (evaluacionCerrada) {
        await tx.evaluacion.update({
          where: { id: evaluacionCerrada.id },
          data: { idEstado: estadoAprobada.id },
        });
      }

      return { ...expediente, id: expediente.id.toString(), idCaso: expediente.idCaso.toString() };
    });
  }

  /**
   * Roles internos (Admin/Coordinador/Tecnico) pueden ver todo, y filtrar
   * opcionalmente por empresa con el query param. Roles de empresa SOLO
   * pueden ver los suyos -- el server IGNORA cualquier empresaId que el
   * cliente intente mandar y fuerza el propio, para que no se pueda pedir
   * el de otra empresa cambiando el parametro.
   */
  async buscar(filtros: { empresaId?: string; estado?: string; desde?: string; hasta?: string }, user: JwtPayload) {
    let empresaIdEfectivo: string | undefined;

    if (ROLES_INTERNOS.includes(user.rol)) {
      empresaIdEfectivo = filtros.empresaId;
    } else {
      if (!user.empresaId) {
        throw new ForbiddenException('Su usuario no está vinculado a ninguna empresa.');
      }
      empresaIdEfectivo = user.empresaId; // se ignora filtros.empresaId a propósito
    }

    const expedientes = await this.prisma.expediente.findMany({
      where: {
        estado: filtros.estado,
        fechaCierre: {
          gte: filtros.desde ? new Date(filtros.desde) : undefined,
          lte: filtros.hasta ? new Date(filtros.hasta) : undefined,
        },
        caso: empresaIdEfectivo
          ? { establecimiento: { idEmpresa: BigInt(empresaIdEfectivo) } }
          : undefined,
      },
      include: { caso: { include: { establecimiento: { include: { empresa: true } } } } },
      orderBy: { fechaCierre: 'desc' },
    });
    return expedientes.map((e) => ({ ...e, id: e.id.toString(), idCaso: e.idCaso.toString() }));
  }
}
