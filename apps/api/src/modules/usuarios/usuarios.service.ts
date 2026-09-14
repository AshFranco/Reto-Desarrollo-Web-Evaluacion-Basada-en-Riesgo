import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResolverRegistroDto } from './dto/resolver-registro.dto';

/**
 * Adaptado: el esquema oficial NO tiene una tabla `registro_usuario`
 * separada -- el estado de aprobación vive directo en `usuario.estado`.
 * "Resolver registro" ahora es simplemente transicionar ese campo.
 */
@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPendientesValidacion() {
    const usuarios = await this.prisma.usuario.findMany({
      where: { estado: 'PENDIENTE_VALIDACION' },
      select: {
        id: true,
        nombreCompleto: true,
        correoElectronico: true,
        fechaCreacion: true,
        roles: { include: { rol: true } },
      },
      orderBy: { fechaCreacion: 'asc' },
    });
    return usuarios.map((u) => ({
      id: u.id.toString(),
      nombreCompleto: u.nombreCompleto,
      correoElectronico: u.correoElectronico,
      fechaCreacion: u.fechaCreacion,
      roles: u.roles.map((r) => r.rol.nombre ?? r.rol.codigo),
    }));
  }


  async resolverRegistro(usuarioId: string, dto: ResolverRegistroDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: BigInt(usuarioId) } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    if (usuario.estado !== 'PENDIENTE_VALIDACION') {
      throw new BadRequestException('Este usuario ya fue resuelto.');
    }
    if (dto.decision === 'RECHAZADO' && !dto.motivoRechazo) {
      throw new BadRequestException('Debe indicar el motivo del rechazo.');
    }

    const actualizado = await this.prisma.usuario.update({
      where: { id: BigInt(usuarioId) },
      data: { estado: dto.decision, motivoRechazo: dto.motivoRechazo },
    });
    return { ...actualizado, id: actualizado.id.toString(), idEmpresa: actualizado.idEmpresa?.toString() ?? null };
  }

  async perfil(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: BigInt(usuarioId) },
      include: { roles: { include: { rol: true } } },
    });
    return {
      id: usuario.id.toString(),
      nombreCompleto: usuario.nombreCompleto,
      correoElectronico: usuario.correoElectronico,
      telefono: usuario.telefono,
      roles: usuario.roles.map((r) => r.rol.codigo),
      idEmpresa: usuario.idEmpresa?.toString() ?? null,
      dobleFactorActivo: usuario.dobleFactorActivo,
    };
  }

  /**
   * RF-10 (Asignación de Evaluador): el Coordinador necesita un selector
   * real de técnicos disponibles, no un campo de texto libre para el id.
   */
  async listarPorRol(codigoRol: string) {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        estado: 'APROBADO',
        roles: { some: { rol: { codigo: codigoRol } } },
      },
      select: { id: true, nombreCompleto: true, correoElectronico: true },
      orderBy: { nombreCompleto: 'asc' },
    });
    return usuarios.map((u) => ({ ...u, id: u.id.toString() }));
  }

  async listarTodos() {
    const usuarios = await this.prisma.usuario.findMany({
      include: {
        roles: { include: { rol: true } },
        empresa: { select: { razonSocial: true, rnc: true } },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    return usuarios.map((u) => ({
      id: u.id.toString(),
      nombreCompleto: u.nombreCompleto,
      correoElectronico: u.correoElectronico,
      telefono: u.telefono,
      estado: u.estado,
      roles: u.roles.map((r) => ({
        codigo: r.rol.codigo,
        nombre: r.rol.nombre,
      })),
      empresa: u.empresa
        ? {
            razonSocial: u.empresa.razonSocial,
            rnc: u.empresa.rnc,
          }
        : null,
      fechaCreacion: u.fechaCreacion,
    }));
  }

  async actualizarRol(usuarioId: string, nuevoRolCodigo: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: BigInt(usuarioId) },
      include: { roles: { include: { rol: true } } },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    // Protección estricta: No permitir revocar el rol de Administrador del Sistema
    const esAdmin = usuario.roles.some((r) => r.rol.codigo === 'ADMINISTRADOR');
    if (esAdmin && nuevoRolCodigo !== 'ADMINISTRADOR') {
      throw new BadRequestException('No se puede revocar el rol del Administrador del Sistema.');
    }

    const rol = await this.prisma.rol.findUnique({ where: { codigo: nuevoRolCodigo } });
    if (!rol) throw new BadRequestException(`El rol '${nuevoRolCodigo}' no es válido.`);

    return this.prisma.$transaction(async (tx) => {
      await tx.usuarioRol.deleteMany({ where: { idUsuario: BigInt(usuarioId) } });
      await tx.usuarioRol.create({
        data: {
          idUsuario: BigInt(usuarioId),
          idRol: rol.id,
        },
      });

      return { mensaje: `Rol actualizado correctamente a ${rol.nombre}.`, rol: rol.codigo };
    });
  }

  async actualizarEstado(usuarioId: string, nuevoEstado: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: BigInt(usuarioId) },
      include: { roles: { include: { rol: true } } },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    // Protección estricta: No permitir desactivar o bloquear al Administrador del Sistema
    const esAdmin = usuario.roles.some((r) => r.rol.codigo === 'ADMINISTRADOR');
    if (esAdmin && (nuevoEstado === 'BLOQUEADO' || nuevoEstado === 'INACTIVO')) {
      throw new BadRequestException('No se puede desactivar ni bloquear la cuenta del Administrador del Sistema.');
    }

    const estadosValidos = ['APROBADO', 'INACTIVO', 'BLOQUEADO', 'PENDIENTE_VALIDACION'];
    if (!estadosValidos.includes(nuevoEstado)) {
      throw new BadRequestException(`Estado '${nuevoEstado}' no es válido.`);
    }

    const actualizado = await this.prisma.usuario.update({
      where: { id: BigInt(usuarioId) },
      data: { estado: nuevoEstado },
    });

    return {
      id: actualizado.id.toString(),
      estado: actualizado.estado,
      mensaje: `Estado de cuenta actualizado a ${actualizado.estado}.`,
    };
  }
}
