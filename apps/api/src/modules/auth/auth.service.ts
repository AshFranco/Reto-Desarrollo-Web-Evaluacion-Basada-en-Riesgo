import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { LoginThrottleService } from './login-throttle.service';
import { LoginDto } from './dto/login.dto';
import { RegistroUsuarioDto } from './dto/registro-usuario.dto';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/**
 * Orden de prioridad para elegir el "rol principal" cuando un usuario
 * tiene varios roles asignados (ej. cuentas internas de prueba). Sin esto,
 * Prisma devuelve las filas de `usuario_rol` en un orden no garantizado,
 * causando 403 intermitentes según qué rol "ganara" al azar.
 */
const PRIORIDAD_ROLES = [
  'ADMINISTRADOR',
  'COORDINADOR',
  'TECNICO_EVALUADOR',
  'ADMINISTRADOR_EMPRESA',
  'USUARIO_DELEGADO',
];

function elegirRolPrincipal(roles: { rol: { codigo: string } }[]): string | null {
  const codigos = roles.map((r) => r.rol.codigo);
  for (const prioridad of PRIORIDAD_ROLES) {
    if (codigos.includes(prioridad)) return prioridad;
  }
  return codigos[0] ?? null;
}

/**
 * Adaptado al esquema oficial (DBML de 51 tablas): el rol ya no es un
 * campo enum fijo en `usuario`, sino una relación muchos-a-muchos vía
 * `usuario_rol` -> `rol`. Para simplificar el flujo de auth, se asume
 * UN rol principal por usuario (el primero asignado); si el dominio
 * necesita múltiples roles simultáneos reales, este servicio debe
 * revisarse junto con RolesGuard.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly loginThrottle: LoginThrottleService,
  ) {}

  async registrar(dto: RegistroUsuarioDto) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: BigInt(dto.empresaId) },
      select: { id: true },
    });
    if (!empresa) {
      throw new BadRequestException('La empresa indicada no existe.');
    }

    const rol = await this.prisma.rol.findUnique({ where: { codigo: dto.rol } });
    if (!rol) {
      throw new BadRequestException('El rol indicado no es válido.');
    }

    const existente = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { correoElectronico: dto.correo },
          { cedulaPasaporte: dto.cedulaPasaporte },
        ],
      },
    });
    if (existente) {
      throw new BadRequestException('Ya existe un usuario con ese correo o cédula.');
    }

    const contrasenaHash = await this.passwordService.hash(dto.password);

    // Estado inicial SIEMPRE fijado por el servidor (nunca por el body del cliente).
    const usuario = await this.prisma.usuario.create({
      data: {
        nombreCompleto: dto.nombreCompleto,
        cedulaPasaporte: dto.cedulaPasaporte,
        correoElectronico: dto.correo,
        telefono: dto.telefono,
        contrasenaHash,
        idEmpresa: BigInt(dto.empresaId),
        cartaAutorizacionUrl: dto.cartaAutorizacionUrl ?? null,
        estado: 'PENDIENTE_VALIDACION',
        roles: { create: { idRol: rol.id } },
      },
      select: { id: true, correoElectronico: true, nombreCompleto: true, cartaAutorizacionUrl: true },
    });

    return {
      mensaje:
        'Registro recibido. Su cuenta quedará activa tras la validación del Administrador.',
      usuario: { ...usuario, id: usuario.id.toString() },
    };
  }

  async login(dto: LoginDto, meta: RequestMeta) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correoElectronico: dto.correo },
      include: { roles: { include: { rol: true } } },
    });

    // Respuesta indistinguible si el usuario no existe (evita enumeración de correos).
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    await this.loginThrottle.assertNotLocked(usuario.id);

    if (usuario.estado !== 'APROBADO') {
      throw new UnauthorizedException('Su cuenta aún no ha sido aprobada.');
    }

    const passwordValida = await this.passwordService.verify(
      usuario.contrasenaHash,
      dto.password,
    );
    if (!passwordValida) {
      await this.loginThrottle.registrarIntentoFallido(usuario.id);
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (usuario.dobleFactorActivo) {
      if (!usuario.secretoTotp) {
        throw new BadRequestException('El usuario tiene MFA marcado como activo pero no tiene un secreto TOTP configurado.');
      }
      return { requiereMfa: true, mensaje: 'Ingrese su código de autenticación de dos factores.' };
    }

    await this.loginThrottle.registrarLoginExitoso(usuario.id);

    const rolPrincipal = elegirRolPrincipal(usuario.roles);
    if (!rolPrincipal) {
      throw new UnauthorizedException('El usuario no tiene un rol asignado.');
    }

    const accessToken = this.tokenService.signAccessToken({
      sub: usuario.id.toString(),
      rol: rolPrincipal,
      empresaId: usuario.idEmpresa ? usuario.idEmpresa.toString() : null,
    });
    const refreshToken = await this.tokenService.issueRefreshToken(usuario.id, meta);

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id.toString(),
        nombreCompleto: usuario.nombreCompleto,
        rol: rolPrincipal,
        empresaId: usuario.idEmpresa ? usuario.idEmpresa.toString() : null,
      },
    };
  }

  async refresh(rawRefreshToken: string, meta: RequestMeta) {
    const result = await this.tokenService.rotateRefreshToken(rawRefreshToken, meta);
    if (!result) {
      throw new UnauthorizedException('Sesión inválida. Inicie sesión nuevamente.');
    }

    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: result.userId },
      include: { roles: { include: { rol: true } } },
    });

    const rolPrincipal = elegirRolPrincipal(usuario.roles);

    const accessToken = this.tokenService.signAccessToken({
      sub: usuario.id.toString(),
      rol: rolPrincipal ?? '',
      empresaId: usuario.idEmpresa ? usuario.idEmpresa.toString() : null,
    });

    return { accessToken, refreshToken: result.newRawToken };
  }

  async logout(userId: string): Promise<void> {
    await this.tokenService.revokeAllForUser(BigInt(userId));
  }

  async solicitarRecuperacionContrasena(correo: string) {
    const mensajeGenerico = 'Si el correo electrónico está registrado en el sistema, recibirá las instrucciones para restablecer su contraseña.';

    try {
      const correoLimpio = (correo || '').trim().toLowerCase();
      if (!correoLimpio) return { mensaje: mensajeGenerico };

      const usuario = await this.prisma.usuario.findFirst({
        where: { correoElectronico: correoLimpio },
      });

      if (!usuario) {
        return { mensaje: mensajeGenerico };
      }

      const resetToken = this.tokenService.signAccessToken({
        sub: usuario.id.toString(),
        rol: 'RESET_PASSWORD',
        empresaId: null,
      });

      return {
        mensaje: mensajeGenerico,
        token: resetToken,
      };
    } catch {
      return { mensaje: mensajeGenerico };
    }
  }

  async resetearContrasena(token: string, nuevaContrasena: string) {
    let payload;
    try {
      payload = this.tokenService.verifyAccessToken(token);
    } catch {
      throw new BadRequestException('Token de recuperación inválido o expirado.');
    }

    if (payload.rol !== 'RESET_PASSWORD') {
      throw new BadRequestException('El token proporcionado no es un token de recuperación de contraseña.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    if (!usuario) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    const contrasenaHash = await this.passwordService.hash(nuevaContrasena);
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { contrasenaHash, intentosFallidos: 0, bloqueadoHasta: null },
    });

    await this.tokenService.revokeAllForUser(usuario.id);

    return { mensaje: 'Contraseña restablecida exitosamente. Ya puede iniciar sesión con su nueva contraseña.' };
  }
}
