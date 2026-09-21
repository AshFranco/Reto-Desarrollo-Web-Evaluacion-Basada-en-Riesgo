import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearSolicitudBpmDto, EnviarSolicitudDto } from './dto/solicitud-bpm.dto';
import { JwtPayload } from '../auth/token.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { StorageService } from '../../common/services/storage.service';

const TIPOS_ADJUNTO_VALIDOS = ['CROQUIS', 'MEMORIA_DESCRIPTIVA', 'OTRO'];

@Injectable()
export class SolicitudesBpmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly storage: StorageService,
  ) {}

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
    }).then(async (resultado) => {
      await this.notificaciones.notificarPorRol('COORDINADOR', {
        tipo: 'SOLICITUD_BPM_RECIBIDA',
        titulo: 'Nueva solicitud BPM',
        mensaje: `Se recibió una nueva solicitud BPM (#${solicitudId}) pendiente de asignación de evaluador.`,
        entidad: 'solicitudBpm',
        idEntidad: solicitudId,
      });
      return resultado;
    });
  }

  async misSolicitudes(user: JwtPayload) {
    if (!user.empresaId) return [];
    const solicitudes = await this.prisma.solicitudBpm.findMany({
      where: { idEmpresa: BigInt(user.empresaId) },
      orderBy: { fechaCreacion: 'desc' },
    });
    return solicitudes.map((s) => this.serializar(s));
  }

  /**
   * Adjuntos (croquis, memoria descriptiva, etc.) solo se admiten mientras
   * la solicitud está en borrador -- una vez enviada (Caso creado), el
   * expediente queda formalmente presentado ante DIGEMAPS.
   */
  async subirAdjunto(
    solicitudId: string,
    file: Express.Multer.File,
    tipo: string,
    user: JwtPayload,
  ) {
    if (!TIPOS_ADJUNTO_VALIDOS.includes(tipo)) {
      throw new BadRequestException(`Tipo de adjunto inválido. Use uno de: ${TIPOS_ADJUNTO_VALIDOS.join(', ')}.`);
    }
    const solicitud = await this.obtenerSolicitudPropia(solicitudId, user);
    if (solicitud.estado !== 'Pendiente de Asignacion') {
      throw new BadRequestException('No se pueden agregar adjuntos a una solicitud ya enviada.');
    }

    const { claveArchivo } = await this.storage.guardar(file.buffer, file.mimetype);

    const adjunto = await this.prisma.adjuntoSolicitudBpm.create({
      data: {
        idSolicitud: solicitud.id,
        tipo,
        nombreArchivo: file.originalname || claveArchivo,
        rutaAlmacenamiento: claveArchivo,
        tipoMime: file.mimetype,
        tamanoBytes: BigInt(file.size),
      },
    });

    return this.serializarAdjunto(adjunto);
  }

  async listarAdjuntos(solicitudId: string, user: JwtPayload) {
    await this.obtenerSolicitudPropia(solicitudId, user);
    const adjuntos = await this.prisma.adjuntoSolicitudBpm.findMany({
      where: { idSolicitud: BigInt(solicitudId) },
      orderBy: { fechaCarga: 'desc' },
    });
    return adjuntos.map((a) => this.serializarAdjunto(a));
  }

  async eliminarAdjunto(adjuntoId: string, user: JwtPayload) {
    const adjunto = await this.prisma.adjuntoSolicitudBpm.findUnique({
      where: { id: BigInt(adjuntoId) },
      include: { solicitud: true },
    });
    if (!adjunto) throw new NotFoundException('Adjunto no encontrado.');
    if (!this.esRolInterno(user) && adjunto.solicitud.idEmpresa.toString() !== user.empresaId) {
      throw new ForbiddenException('No tiene acceso a este adjunto.');
    }
    if (adjunto.solicitud.estado !== 'Pendiente de Asignacion') {
      throw new BadRequestException('No se pueden eliminar adjuntos de una solicitud ya enviada.');
    }

    await this.storage.eliminar(adjunto.rutaAlmacenamiento);
    await this.prisma.adjuntoSolicitudBpm.delete({ where: { id: adjunto.id } });

    return { mensaje: 'Adjunto eliminado correctamente.' };
  }

  private esRolInterno(user: JwtPayload) {
    return user.rol === 'ADMINISTRADOR' || user.rol === 'COORDINADOR';
  }

  private async obtenerSolicitudPropia(solicitudId: string, user: JwtPayload) {
    const solicitud = await this.prisma.solicitudBpm.findUnique({ where: { id: BigInt(solicitudId) } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');
    if (!this.esRolInterno(user) && solicitud.idEmpresa.toString() !== user.empresaId) {
      throw new ForbiddenException('No tiene acceso a esta solicitud.');
    }
    return solicitud;
  }

  private serializar(s: any) {
    return { ...s, id: s.id.toString(), idEmpresa: s.idEmpresa.toString(), idUsuario: s.idUsuario.toString() };
  }

  private serializarAdjunto(a: any) {
    return { ...a, id: a.id.toString(), idSolicitud: a.idSolicitud.toString(), tamanoBytes: a.tamanoBytes?.toString() ?? null };
  }
}
