import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResolverRegistroDto } from './dto/resolver-registro.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { Activar2FaDto } from './dto/activar-2fa.dto';
import { Desactivar2FaDto } from './dto/desactivar-2fa.dto';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { EncryptionService } from '../../common/services/encryption.service';
import * as qrcode from 'qrcode';
import { authenticator } from 'otplib';

/**
 * Adaptado: el esquema oficial NO tiene una tabla `registro_usuario`
 * separada -- el estado de aprobación vive directo en `usuario.estado`
 * "Resolver registro" ahora es simplemente transicionar ese campo.
 */
@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly encryptionService: EncryptionService,
  ) {}


  async listarPendientesValidacion() {
    const usuarios = await this.prisma.usuario.findMany({
      where: { estado: 'PENDIENTE_VALIDACION' },
      select: {
        id: true,
        nombreCompleto: true,
        correoElectronico: true,
        cedulaPasaporte: true,
        telefono: true,
        cartaAutorizacionUrl: true,
        fechaCreacion: true,
        roles: { include: { rol: true } },
      },
      orderBy: { fechaCreacion: 'asc' },
    });
    return usuarios.map((u) => ({
      id: u.id.toString(),
      nombreCompleto: u.nombreCompleto,
      correoElectronico: u.correoElectronico,
      cedulaPasaporte: u.cedulaPasaporte,
      telefono: u.telefono,
      cartaAutorizacionUrl: u.cartaAutorizacionUrl,
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

  async actualizarPerfil(usuarioId: string, dto: ActualizarPerfilDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: BigInt(usuarioId) },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    // Si intenta activar doble factor desde aquí sin vinculación TOTP previa, requerir el flujo formal
    if (dto.dobleFactorActivo === true && !usuario.dobleFactorActivo) {
      throw new BadRequestException(
        'Para activar la verificación en dos pasos debe vincular su aplicación autenticadora escaneando el código QR.',
      );
    }

    const data: { nombreCompleto?: string; telefono?: string; dobleFactorActivo?: boolean } = {};
    if (dto.nombreCompleto !== undefined) data.nombreCompleto = dto.nombreCompleto;
    if (dto.telefono !== undefined) data.telefono = dto.telefono;

    // Si solicita desactivarlo directamente
    if (dto.dobleFactorActivo === false && usuario.dobleFactorActivo) {
      data.dobleFactorActivo = false;
      await this.prisma.$executeRaw`
        UPDATE usuario SET secreto_totp = NULL WHERE id = ${BigInt(usuarioId)}
      `;
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.usuario.update({
        where: { id: BigInt(usuarioId) },
        data,
      });
    }

    return this.perfil(usuarioId);
  }

  async generar2Fa(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: BigInt(usuarioId) },
      select: { id: true, correoElectronico: true, dobleFactorActivo: true },
    });

    const secreto = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      usuario.correoElectronico,
      'DIGEMAPS - EBR/BPM',
      secreto,
    );

    const qrCode = await qrcode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 250,
    });

    return {
      secreto,
      qrCode,
      otpauthUrl,
      correo: usuario.correoElectronico,
      dobleFactorActivo: usuario.dobleFactorActivo,
    };
  }

  async activar2Fa(usuarioId: string, dto: Activar2FaDto) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: BigInt(usuarioId) },
    });

    const codigoLimpio = dto.codigo.trim();
    authenticator.options = { window: 2 };
    const esValido = authenticator.check(codigoLimpio, dto.secreto);

    if (!esValido) {
      throw new BadRequestException(
        'El código de 6 dígitos ingresado es incorrecto o ha expirado. Verifique que la hora de su teléfono esté sincronizada automáticamente.',
      );
    }

    const secretoCifrado = this.encryptionService.encrypt(dto.secreto);

    await this.prisma.$executeRaw`
      UPDATE usuario
      SET secreto_totp = ${secretoCifrado}, doble_factor_activo = true
      WHERE id = ${BigInt(usuarioId)}
    `;

    return {
      ok: true,
      mensaje: 'Verificación en dos pasos (Google Authenticator) activada correctamente.',
    };
  }

  async desactivar2Fa(usuarioId: string, dto: Desactivar2FaDto) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: BigInt(usuarioId) },
    });

    const contrasenaValida = await this.passwordService.verify(
      usuario.contrasenaHash,
      dto.contrasenaActual,
    );

    if (!contrasenaValida) {
      throw new UnauthorizedException('La contraseña ingresada no es correcta.');
    }

    await this.prisma.$executeRaw`
      UPDATE usuario
      SET secreto_totp = NULL, doble_factor_activo = false
      WHERE id = ${BigInt(usuarioId)}
    `;

    return {
      ok: true,
      mensaje: 'La verificación en dos pasos ha sido desactivada.',
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

  /**
   * RF-01: Cambio de contraseña por el propio usuario autenticado.
   * Valida la contraseña actual, exige que la nueva sea distinta,
   * y revoca todos los refresh tokens del usuario en todos los dispositivos
   * para forzar re-autenticación (buena práctica de seguridad).
   */
  async cambiarContrasena(usuarioId: string, dto: CambiarContrasenaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: BigInt(usuarioId) },
      select: { id: true, contrasenaHash: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    // 1. Verificar que la contraseña actual sea correcta
    const actualValida = await this.passwordService.verify(
      usuario.contrasenaHash,
      dto.contrasenaActual,
    );
    if (!actualValida) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }

    // 2. La nueva contraseña no puede ser igual a la actual
    const esMismaContrasena = await this.passwordService.verify(
      usuario.contrasenaHash,
      dto.contrasenaNueva,
    );
    if (esMismaContrasena) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
      );
    }

    // 3. Hashear y guardar la nueva contraseña
    const nuevaHash = await this.passwordService.hash(dto.contrasenaNueva);
    await this.prisma.usuario.update({
      where: { id: BigInt(usuarioId) },
      data: { contrasenaHash: nuevaHash },
    });

    // 4. Revocar todos los refresh tokens para forzar re-login en todos los dispositivos
    await this.tokenService.revokeAllForUser(BigInt(usuarioId));

    return {
      mensaje:
        'Contraseña actualizada correctamente. Su sesión en otros dispositivos ha sido cerrada.',
    };
  }
}
