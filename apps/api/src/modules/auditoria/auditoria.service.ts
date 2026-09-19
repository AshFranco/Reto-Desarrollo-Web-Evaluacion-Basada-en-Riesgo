import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrarAuditoriaDto, BuscarAuditoriaQuery } from './dto/registrar-auditoria.dto';

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una nueva entrada de auditoría en la base de datos (prisma.auditoria.create).
   */
  async registrar(dto: RegistrarAuditoriaDto) {
    try {
      const idUsuario = dto.idUsuario !== undefined && dto.idUsuario !== null
        ? BigInt(dto.idUsuario.toString())
        : null;

      const entrada = await this.prisma.auditoria.create({
        data: {
          entidad: dto.entidad,
          idEntidad: dto.idEntidad ? dto.idEntidad.toString() : null,
          accion: dto.accion,
          idUsuario,
          ip: dto.ip || null,
          valoresAnteriores: dto.valoresAnteriores || undefined,
          valoresNuevos: dto.valoresNuevos || undefined,
        },
      });

      this.logger.debug(`Auditoría registrada [${dto.accion}] en ${dto.entidad} (ID: ${dto.idEntidad || 'N/A'})`);
      return this.serializar(entrada);
    } catch (error) {
      this.logger.error(`Error al registrar auditoría: ${(error as any).message}`, (error as any).stack);
      // No interrumpimos la operación principal por fallo de registro de log
      return null;
    }
  }

  /**
   * Consulta el historial de auditoría con filtros.
   */
  async listar(query: BuscarAuditoriaQuery) {
    const where: any = {};
    if (query.entidad) where.entidad = query.entidad;
    if (query.accion) where.accion = query.accion;
    if (query.idUsuario) where.idUsuario = BigInt(query.idUsuario);

    const registros = await this.prisma.auditoria.findMany({
      where,
      orderBy: { fechaHora: 'desc' },
      take: 100,
      include: {
        usuario: {
          select: {
            id: true,
            nombreCompleto: true,
            correoElectronico: true,
          },
        },
      },
    });

    return registros.map(r => this.serializar(r));
  }

  private serializar(r: any) {
    return {
      ...r,
      id: r.id?.toString(),
      idUsuario: r.idUsuario?.toString(),
      usuario: r.usuario ? { ...r.usuario, id: r.usuario.id.toString() } : null,
    };
  }
}
