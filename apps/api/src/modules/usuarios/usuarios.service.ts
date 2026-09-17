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
      select: { id: true, nombreCompleto: true, correoElectronico: true, cedulaPasaporte: true, telefono: true, cartaAutorizacionUrl: true, fechaCreacion: true },
      orderBy: { fechaCreacion: 'asc' },
    });
    return usuarios.map((u) => ({ ...u, id: u.id.toString() }));
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
   * real de técnicos disponibles con su carga de trabajo visible.
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

  async listarTecnicosConCarga() {
    const tecnicos = await this.prisma.usuario.findMany({
      where: {
        estado: 'APROBADO',
        roles: { some: { rol: { codigo: 'TECNICO_EVALUADOR' } } },
      },
      select: {
        id: true,
        nombreCompleto: true,
        correoElectronico: true,
        asignacionesEvaluador: {
          where: { estado: 'Asignado' },
          select: { id: true },
        },
      },
      orderBy: { nombreCompleto: 'asc' },
    });

    return tecnicos.map((t) => ({
      id: t.id.toString(),
      nombreCompleto: t.nombreCompleto,
      correoElectronico: t.correoElectronico,
      cargaAsignada: t.asignacionesEvaluador.length,
    }));
  }
}
