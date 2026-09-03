import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

  async buscar(filtros: { empresaId?: string; estado?: string; desde?: string; hasta?: string }) {
    const expedientes = await this.prisma.expediente.findMany({
      where: {
        estado: filtros.estado,
        fechaCierre: {
          gte: filtros.desde ? new Date(filtros.desde) : undefined,
          lte: filtros.hasta ? new Date(filtros.hasta) : undefined,
        },
        caso: filtros.empresaId
          ? { establecimiento: { idEmpresa: BigInt(filtros.empresaId) } }
          : undefined,
      },
      include: { caso: { include: { establecimiento: { include: { empresa: true } } } } },
      orderBy: { fechaCierre: 'desc' },
    });
    return expedientes.map((e) => ({ ...e, id: e.id.toString(), idCaso: e.idCaso.toString() }));
  }
}
