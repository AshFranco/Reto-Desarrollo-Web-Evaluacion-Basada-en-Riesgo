import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/token.service';

const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];

export interface FiltrosBusquedaCaso {
  empresaId?: string;
  solicitudId?: string;
  evaluacionId?: string;
  estado?: string;
  fechaCreacionDesde?: string;
  fechaCreacionHasta?: string;
}

@Injectable()
export class CasosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(user: JwtPayload) {
    const where = ROLES_INTERNOS.includes(user.rol)
      ? {}
      : { establecimiento: { idEmpresa: user.empresaId ? BigInt(user.empresaId) : undefined } };

    const casos = await this.prisma.caso.findMany({
      where,
      include: {
        establecimiento: { select: { nombre: true, idEmpresa: true } },
        origen: true,
        asignaciones: { where: { estado: 'Asignado' }, include: { evaluador: { select: { nombreCompleto: true } } } },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
    return casos.map((c) => this.serializar(c));
  }

  /**
   * Búsqueda histórica completa (RF de consulta histórica -- Fase 7).
   * A diferencia de GET /expedientes (solo cubre casos ya CERRADOS con
   * fecha_cierre), esto busca sobre TODO caso.estado y permite filtrar
   * por solicitud/evaluación específica, no solo por rango de fechas.
   *
   * Mismo scoping por empresa que listar(): roles de empresa solo ven
   * los suyos, forzado server-side, ignorando cualquier empresaId que
   * intenten mandar en los filtros.
   */
  async buscarHistorico(filtros: FiltrosBusquedaCaso, user: JwtPayload) {
    if (filtros.fechaCreacionDesde && filtros.fechaCreacionHasta) {
      if (new Date(filtros.fechaCreacionDesde) > new Date(filtros.fechaCreacionHasta)) {
        throw new BadRequestException('La fecha inicial no puede ser posterior a la fecha final.');
      }
    }

    const empresaIdEfectivo = ROLES_INTERNOS.includes(user.rol) ? filtros.empresaId : user.empresaId;

    let hastaDate: Date | undefined;
    if (filtros.fechaCreacionHasta) {
      hastaDate = new Date(filtros.fechaCreacionHasta);
      if (filtros.fechaCreacionHasta.length === 10) {
        hastaDate.setUTCHours(23, 59, 59, 999);
      }
    }

    const where: any = {
      estado: filtros.estado,
      establecimiento: empresaIdEfectivo ? { idEmpresa: BigInt(empresaIdEfectivo) } : undefined,
      fechaCreacion: {
        gte: filtros.fechaCreacionDesde ? new Date(filtros.fechaCreacionDesde) : undefined,
        lte: hastaDate,
      },
    };
    if (filtros.solicitudId) where.idSolicitud = BigInt(filtros.solicitudId);
    if (filtros.evaluacionId) {
      where.evaluaciones = { some: { id: BigInt(filtros.evaluacionId) } };
    }

    const casos = await this.prisma.caso.findMany({
      where,
      include: {
        establecimiento: { include: { empresa: { select: { id: true, razonSocial: true } } } },
        origen: true,
        solicitud: true,
        evaluaciones: { select: { id: true, idEstado: true, fechaFinalizacion: true } },
        expediente: true,
      },
      orderBy: { fechaCreacion: 'desc' },
    });
    return casos.map((c) => this.serializar(c));
  }

  async actualizarPrioridad(id: string, prioridad: string) {
    const caso = await this.prisma.caso.findUnique({ where: { id: BigInt(id) } });
    if (!caso) throw new NotFoundException('Caso no encontrado.');
    if (caso.estado === 'Cerrado' || caso.estado === 'CERRADO') {
      throw new BadRequestException('No se puede modificar la prioridad de un caso cerrado.');
    }
    const actualizado = await this.prisma.caso.update({
      where: { id: BigInt(id) },
      data: { prioridad: prioridad.toUpperCase() },
      include: {
        establecimiento: { include: { empresa: true } },
        solicitud: true,
        alerta: true,
        denuncia: true,
        programacion: true,
        evaluaciones: true,
        asignaciones: { where: { estado: 'Asignado' }, include: { evaluador: true } },
        expediente: true,
      },
    });
    return this.serializar(actualizado);
  }

  async obtener(id: string) {
    const caso = await this.prisma.caso.findUnique({
      where: { id: BigInt(id) },
      include: {
        establecimiento: { include: { empresa: true } },
        solicitud: true,
        alerta: true,
        denuncia: true,
        programacion: true,
        evaluaciones: { include: { estado: true, calculoRiesgo: { include: { nivelRiesgo: true } }, informe: true } },
        asignaciones: { where: { estado: 'Asignado' }, include: { evaluador: true } },
        expediente: true,
      },
    });
    return caso ? this.serializar(caso) : null;
  }

  private serializar(c: any) {
    return {
      ...c,
      id: c.id?.toString(),
      idEstablecimiento: c.idEstablecimiento?.toString(),
      asignaciones: c.asignaciones?.map((a: any) => ({
        ...a,
        id: a.id?.toString(),
        idCaso: a.idCaso?.toString(),
        idEvaluador: a.idEvaluador?.toString(),
        idCoordinador: a.idCoordinador?.toString(),
        evaluador: a.evaluador
          ? {
              ...a.evaluador,
              id: a.evaluador.id?.toString(),
            }
          : undefined,
      })),
      evaluaciones: c.evaluaciones?.map((e: any) => ({
        ...e,
        id: e.id?.toString(),
        informe: e.informe ? {
          ...e.informe,
          id: e.informe.id?.toString(),
          idEvaluacion: e.informe.idEvaluacion?.toString()
        } : undefined,
        calculoRiesgo: e.calculoRiesgo ? {
          ...e.calculoRiesgo,
          id: e.calculoRiesgo.id?.toString(),
          idEvaluacion: e.calculoRiesgo.idEvaluacion?.toString(),
          porcentajeCumplimientoBpm: e.calculoRiesgo.porcentajeCumplimientoBpm?.toString()
        } : undefined
      })),
    };
  }
}

