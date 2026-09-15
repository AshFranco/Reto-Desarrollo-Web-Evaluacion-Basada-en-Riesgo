import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { LoginThrottleService } from './login-throttle.service';
import { LoginDto } from './dto/login.dto';
import { RegistroUsuarioDto } from './dto/registro-usuario.dto';
import { RecuperarContrasenaDto } from './dto/recuperar-contrasena.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';
import { EmailService } from '../../common/services/email.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { AppConfigService } from '../../config/app-config.service';
import { authenticator } from 'otplib';

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
 * migrar a un array de roles en el token JWT.
 */
export type LoginResult =
  | {
      requiereMfa: false;
      accessToken: string;
      refreshToken: string;
      usuario: {
        id: string;
        nombreCompleto: string;
        rol: string;
        empresaId: string | null;
      };
    }
  | {
      requiereMfa: true;
      mensaje: string;
    };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly loginThrottle: LoginThrottleService,
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
    private readonly config: AppConfigService,
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
        estado: 'PENDIENTE_VALIDACION',
        roles: { create: { idRol: rol.id } },
      },
      select: { id: true, correoElectronico: true, nombreCompleto: true },
    });

    return {
      mensaje:
        'Registro recibido. Su cuenta quedará activa tras la validación del Administrador.',
      usuario: { ...usuario, id: usuario.id.toString() },
    };
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<LoginResult> {
    let usuario = await this.prisma.usuario.findUnique({
      where: { correoElectronico: dto.correo.trim() },
      include: { roles: { include: { rol: true } } },
    });

    if (!usuario) {
      usuario = await this.prisma.usuario.findFirst({
        where: { correoElectronico: { equals: dto.correo.trim(), mode: 'insensitive' } },
        include: { roles: { include: { rol: true } } },
      });
    }

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
      if (!dto.codigoMfa) {
        return {
          requiereMfa: true,
          mensaje:
            'Verificación en dos pasos requerida. Ingrese el código de 6 dígitos de su aplicación autenticadora (Google Authenticator).',
        };
      }

      // Obtener el secreto TOTP cifrado de la base de datos
      const rows = await this.prisma.$queryRaw<{ secreto_totp: string | null }[]>`
        SELECT secreto_totp FROM usuario WHERE id = ${usuario.id}
      `;
      const secretoCifrado = rows[0]?.secreto_totp;

      if (!secretoCifrado) {
        this.logger.error(
          `Usuario ${usuario.id} (${usuario.correoElectronico}) tiene dobleFactorActivo pero no posee secreto_totp en BD.`,
        );
        throw new UnauthorizedException(
          'Error en configuración de doble factor de seguridad. Contacte al Administrador.',
        );
      }

      let secretoPlano: string;
      try {
        secretoPlano = this.encryptionService.decrypt(secretoCifrado);
      } catch (err) {
        this.logger.error(`Error descifrando secreto TOTP del usuario ${usuario.id}: ${err}`);
        throw new UnauthorizedException('Error al procesar la clave de seguridad.');
      }

      const codigoLimpio = dto.codigoMfa.trim();
      const esValido = authenticator.check(codigoLimpio, secretoPlano);

      if (!esValido) {
        await this.loginThrottle.registrarIntentoFallido(usuario.id);
        throw new UnauthorizedException('Código de verificación de 6 dígitos incorrecto o expirado.');
      }
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
      requiereMfa: false,
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

  async solicitarRecuperacionContrasena(dto: RecuperarContrasenaDto) {
    let usuario = await this.prisma.usuario.findUnique({
      where: { correoElectronico: dto.correo.trim() },
      select: {
        id: true,
        correoElectronico: true,
        nombreCompleto: true,
        contrasenaHash: true,
        estado: true,
      },
    });

    if (!usuario) {
      usuario = await this.prisma.usuario.findFirst({
        where: { correoElectronico: { equals: dto.correo.trim(), mode: 'insensitive' } },
        select: {
          id: true,
          correoElectronico: true,
          nombreCompleto: true,
          contrasenaHash: true,
          estado: true,
        },
      });
    }

    // Para evitar enumeración de correos, responder éxito aunque el usuario no exista
    if (!usuario || usuario.estado !== 'APROBADO') {
      return {
        ok: true,
        mensaje:
          'Si el correo electrónico está registrado y activo en la plataforma, recibirá un enlace para restablecer su contraseña.',
      };
    }

    const token = this.tokenService.signPasswordResetToken(
      usuario.id.toString(),
      usuario.contrasenaHash.slice(-10),
    );

    const enlace = `${this.config.frontendUrl}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
    const resultadoEnvio = await this.emailService.enviarRecuperacionContrasena(
      usuario.correoElectronico,
      usuario.nombreCompleto,
      enlace,
    );

    return {
      ok: true,
      mensaje:
        'Si el correo electrónico está registrado y activo en la plataforma, recibirá un enlace para restablecer su contraseña.',
      previewUrl: resultadoEnvio.previewUrl ?? undefined,
    };
  }

  async restablecerContrasena(dto: RestablecerContrasenaDto) {
    let payload: { sub: string; pwh: string; purpose: string };
    try {
      payload = this.tokenService.verifyPasswordResetToken(dto.token);
    } catch {
      throw new BadRequestException('El enlace de restablecimiento es inválido o ha expirado.');
    }

    if (payload.purpose !== 'pwd_reset' || !payload.sub) {
      throw new BadRequestException('Token de restablecimiento no válido.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: BigInt(payload.sub) },
      select: { id: true, contrasenaHash: true, estado: true },
    });

    if (!usuario || usuario.estado !== 'APROBADO') {
      throw new BadRequestException('La cuenta asociada no está disponible o ha sido inhabilitada.');
    }

    // Unicidad: si la contraseña actual ya no coincide con el fragmento del token, ya se usó
    if (usuario.contrasenaHash.slice(-10) !== payload.pwh) {
      throw new BadRequestException(
        'Este enlace de restablecimiento ya ha sido utilizado o ha quedado invalidado.',
      );
    }

    const esMismaContrasena = await this.passwordService.verify(
      usuario.contrasenaHash,
      dto.contrasenaNueva,
    );
    if (esMismaContrasena) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
      );
    }

    const nuevoHash = await this.passwordService.hash(dto.contrasenaNueva);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { contrasenaHash: nuevoHash },
    });

    // Revocar todas las sesiones previas
    await this.tokenService.revokeAllForUser(usuario.id);

    return {
      ok: true,
      mensaje:
        'Su contraseña ha sido restablecida exitosamente. Ya puede iniciar sesión con su nueva clave.',
    };
  }
}
