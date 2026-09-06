import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearSolicitudBpmDto, EnviarSolicitudDto } from './dto/solicitud-bpm.dto';
import { JwtPayload } from '../auth/token.service';

@Injectable()
export class SolicitudesBpmService {
  constructor(private readonly prisma: PrismaService) {}

  async crearBorrador(dto: CrearSolicitudBpmDto, user: JwtPayload) {
    if (!user.empresaId) {
      throw new BadRequestException('El usuario no está asociado a una empresa.');
    }
    const solicitud = await this.prisma.solicitudBpm.create({
      data: {
        idEmpresa: BigInt(user.empresaId),
        idUsuario: BigInt(user.sub),
        tipoEstablecimiento: dto.tipoEstablecimiento,
        motivo: dto.motivo,
        observaciones: dto.observaciones,
        estado: 'Pendiente de Asignacion',
      },
    });
    return this.serializar(solicitud);
  }

  /**
   * Envía la solicitud y crea el Caso (origen=SOLICITUD) que dispara el
   * flujo de asignación de evaluador. Requiere indicar el establecimiento
   * (ver nota en EnviarSolicitudDto).
   */
  async enviar(solicitudId: string, dto: EnviarSolicitudDto, user: JwtPayload) {
    const solicitud = await this.prisma.solicitudBpm.findUnique({ where: { id: BigInt(solicitudId) } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');
    if (solicitud.idEmpresa.toString() !== user.empresaId) {
      throw new ForbiddenException('No tiene acceso a esta solicitud.');
    }
    if (solicitud.estado !== 'Pendiente de Asignacion') {
      throw new BadRequestException('Esta solicitud ya fue enviada.');
    }

    const establecimiento = await this.prisma.establecimiento.findUnique({
      where: { id: BigInt(dto.establecimientoId) },
    });
    if (!establecimiento || establecimiento.idEmpresa.toString() !== user.empresaId) {
      throw new BadRequestException('El establecimiento indicado no pertenece a su empresa.');
    }

    const origenSolicitud = await this.prisma.origenCaso.findUniqueOrThrow({
      where: { codigo: 'SOLICITUD' },
    });

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.solicitudBpm.update({
        where: { id: BigInt(solicitudId) },
        data: { estado: 'Asignada', fechaEnvio: new Date() },
      });

      await tx.caso.create({
        data: {
          idEstablecimiento: establecimiento.id,
          idOrigen: origenSolicitud.id,
          idSolicitud: actualizada.id,
        },
      });

      return this.serializar(actualizada);
    });
  }

  async misSolicitudes(user: JwtPayload) {
    const solicitudes = await this.prisma.solicitudBpm.findMany({
      where: { idEmpresa: user.empresaId ? BigInt(user.empresaId) : undefined },
      orderBy: { fechaCreacion: 'desc' },
    });
    return solicitudes.map((s) => this.serializar(s));
  }

  private serializar(s: any) {
    return { ...s, id: s.id.toString(), idEmpresa: s.idEmpresa.toString(), idUsuario: s.idUsuario.toString() };
  }
}
