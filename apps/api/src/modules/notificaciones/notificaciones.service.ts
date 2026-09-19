import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(data: {
    idUsuario: bigint | string;
    tipo: string;
    titulo: string;
    mensaje: string;
    entidad?: string;
    idEntidad?: bigint | string;
  }) {
    return this.prisma.notificacion.create({
      data: {
        idUsuario: BigInt(data.idUsuario),
        tipo: data.tipo,
        titulo: data.titulo,
        mensaje: data.mensaje,
        entidad: data.entidad,
        idEntidad: data.idEntidad ? BigInt(data.idEntidad) : undefined,
      },
    });
  }

  /**
   * Notifica a todos los usuarios con un rol dado (ej. todos los
   * Coordinadores cuando llega una solicitud BPM nueva). Solo a usuarios
   * con registro APROBADO -- uno pendiente o rechazado no debe recibir
   * notificaciones operativas.
   */
  async notificarPorRol(
    rolCodigo: string,
    data: { tipo: string; titulo: string; mensaje: string; entidad?: string; idEntidad?: bigint | string },
  ) {
    const usuarios = await this.prisma.usuario.findMany({
      where: { estado: 'APROBADO', roles: { some: { rol: { codigo: rolCodigo } } } },
      select: { id: true },
    });
    await Promise.all(usuarios.map((u) => this.crear({ ...data, idUsuario: u.id })));
  }

  /**
   * Notifica a todos los usuarios (Admin Empresa + Delegados) de una
   * empresa (ej. al cerrarse un expediente de uno de sus establecimientos).
   */
  async notificarPorEmpresa(
    idEmpresa: bigint | string,
    data: { tipo: string; titulo: string; mensaje: string; entidad?: string; idEntidad?: bigint | string },
  ) {
    const usuarios = await this.prisma.usuario.findMany({
      where: { estado: 'APROBADO', idEmpresa: BigInt(idEmpresa) },
      select: { id: true },
    });
    await Promise.all(usuarios.map((u) => this.crear({ ...data, idUsuario: u.id })));
  }

  async listarMias(usuarioId: string) {
    const notificaciones = await this.prisma.notificacion.findMany({
      where: { idUsuario: BigInt(usuarioId) },
      orderBy: { fechaCreacion: 'desc' },
      take: 50,
    });
    return notificaciones.map((n) => ({
      ...n,
      id: n.id.toString(),
      idUsuario: n.idUsuario.toString(),
      idEntidad: n.idEntidad?.toString() ?? null,
    }));
  }

  async marcarComoLeida(notificacionId: string, usuarioId: string) {
    const notificacion = await this.prisma.notificacion.findUnique({
      where: { id: BigInt(notificacionId) },
    });
    if (!notificacion || notificacion.idUsuario.toString() !== usuarioId) {
      throw new NotFoundException('Notificación no encontrada.');
    }

    const actualizada = await this.prisma.notificacion.update({
      where: { id: BigInt(notificacionId) },
      data: { leida: true },
    });

    return {
      ...actualizada,
      id: actualizada.id.toString(),
      idUsuario: actualizada.idUsuario.toString(),
      idEntidad: actualizada.idEntidad?.toString() ?? null,
    };
  }
}
