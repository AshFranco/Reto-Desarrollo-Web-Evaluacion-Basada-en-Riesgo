import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  CrearProgramacionInstitucionalDto,
  ActualizarProgramacionInstitucionalDto,
} from './dto/programacion-institucional.dto';

@Injectable()
export class ProgramacionInstitucionalService {
  private readonly logger = new Logger(ProgramacionInstitucionalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * RF-07: Registrar una nueva programación institucional de inspección
   * y crear automáticamente el Caso correspondiente (Ciclo Cerrado).
   */
  async crear(dto: CrearProgramacionInstitucionalDto, usuarioId?: string) {
    const establecimiento = await this.prisma.establecimiento.findUnique({
      where: { id: BigInt(dto.idEstablecimiento) },
    });
    if (!establecimiento) {
      throw new NotFoundException('Establecimiento no encontrado.');
    }

    if (dto.idEvaluacionOrigen) {
      const evalOrigen = await this.prisma.evaluacion.findUnique({
        where: { id: BigInt(dto.idEvaluacionOrigen) },
      });
      if (!evalOrigen) {
        throw new NotFoundException('La evaluación de origen especificada no existe.');
      }
    }

    const fechaProgramada = new Date(dto.fechaProgramada);
    if (isNaN(fechaProgramada.getTime())) {
      throw new BadRequestException('Fecha programada inválida.');
    }

    const programacion = await this.prisma.programacionInstitucional.create({
      data: {
        idEstablecimiento: BigInt(dto.idEstablecimiento),
        idEvaluacionOrigen: dto.idEvaluacionOrigen ? BigInt(dto.idEvaluacionOrigen) : null,
        fechaProgramada,
        frecuenciaAplicada: dto.frecuenciaAplicada || 'SEMESTRAL',
        generadaAutomatica: dto.generadaAutomatica ?? false,
        prioridad: (dto.prioridad || 'NORMAL').toUpperCase(),
        observaciones: dto.observaciones || null,
      },
      include: {
        establecimiento: { include: { empresa: true } },
        evaluacionOrigen: true,
      },
    });

    // Buscar o fallback para el origen de caso PROGRAMACION_INSTITUCIONAL
    let origenProg = await this.prisma.origenCaso.findFirst({
      where: { codigo: 'PROGRAMACION_INSTITUCIONAL' },
    });
    if (!origenProg) {
      origenProg = await this.prisma.origenCaso.findFirst();
    }

    // Crear Caso en ciclo cerrado
    let casoAsociado = null;
    if (origenProg) {
      casoAsociado = await this.prisma.caso.create({
        data: {
          idEstablecimiento: BigInt(dto.idEstablecimiento),
          idOrigen: origenProg.id,
          idProgramacion: programacion.id,
          estado: 'BandejaEntrada',
          prioridad: (dto.prioridad || 'NORMAL').toUpperCase(),
        },
      });
    }

    await this.auditoriaService.registrar({
      entidad: 'ProgramacionInstitucional',
      idEntidad: programacion.id.toString(),
      accion: 'CREAR_PROGRAMACION',
      idUsuario: usuarioId,
      valoresNuevos: {
        idEstablecimiento: dto.idEstablecimiento,
        fechaProgramada: dto.fechaProgramada,
        idCaso: casoAsociado?.id?.toString(),
      },
    });

    return this.serializar({ ...programacion, caso: casoAsociado });
  }

  /**
   * Listar programaciones institucionales activas/históricas
   */
  async listar() {
    const lista = await this.prisma.programacionInstitucional.findMany({
      orderBy: { fechaProgramada: 'asc' },
      include: {
        establecimiento: { include: { empresa: true } },
        evaluacionOrigen: true,
        casos: {
          include: {
            asignaciones: { where: { estado: 'Asignado' }, include: { evaluador: true } },
          },
        },
      },
    });
    return lista.map(p => this.serializar(p));
  }

  /**
   * Obtener detalle de una programación institucional
   */
  async obtener(id: string) {
    const prog = await this.prisma.programacionInstitucional.findUnique({
      where: { id: BigInt(id) },
      include: {
        establecimiento: { include: { empresa: true } },
        evaluacionOrigen: true,
        casos: {
          include: {
            asignaciones: { include: { evaluador: true } },
            evaluaciones: true,
          },
        },
      },
    });
    if (!prog) throw new NotFoundException('Programación institucional no encontrada.');
    return this.serializar(prog);
  }

  /**
   * Actualizar fecha o prioridad de programación institucional
   */
  async actualizar(id: string, dto: ActualizarProgramacionInstitucionalDto, usuarioId?: string) {
    const prog = await this.prisma.programacionInstitucional.findUnique({
      where: { id: BigInt(id) },
    });
    if (!prog) throw new NotFoundException('Programación institucional no encontrada.');

    const data: any = {};
    if (dto.fechaProgramada) data.fechaProgramada = new Date(dto.fechaProgramada);
    if (dto.prioridad) data.prioridad = dto.prioridad.toUpperCase();
    if (dto.observaciones !== undefined) data.observaciones = dto.observaciones;

    const actualizada = await this.prisma.programacionInstitucional.update({
      where: { id: BigInt(id) },
      data,
      include: { establecimiento: true },
    });

    await this.auditoriaService.registrar({
      entidad: 'ProgramacionInstitucional',
      idEntidad: id,
      accion: 'ACTUALIZAR_PROGRAMACION',
      idUsuario: usuarioId,
      valoresAnteriores: { fechaProgramada: prog.fechaProgramada, prioridad: prog.prioridad },
      valoresNuevos: data,
    });

    return this.serializar(actualizada);
  }

  private serializar(p: any) {
    return {
      ...p,
      id: p.id?.toString(),
      idEstablecimiento: p.idEstablecimiento?.toString(),
      idEvaluacionOrigen: p.idEvaluacionOrigen?.toString(),
      casos: p.casos?.map((c: any) => ({
        ...c,
        id: c.id?.toString(),
        idEstablecimiento: c.idEstablecimiento?.toString(),
        idProgramacion: c.idProgramacion?.toString(),
      })),
      caso: p.caso ? { ...p.caso, id: p.caso.id?.toString() } : undefined,
    };
  }
}
