import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { LoginThrottleService } from './login-throttle.service';
import { LoginDto } from './dto/login.dto';
import { RegistroUsuarioDto } from './dto/registro-usuario.dto';
import { SolicitudRecuperacionDto, ResetContrasenaDto } from './dto/recuperacion-contrasena.dto';
import { RecuperarContrasenaDto } from './dto/recuperar-contrasena.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';
import { authenticator } from 'otplib';
import { EncryptionService } from '../../common/services/encryption.service';
import { EmailService } from '../../common/services/email.service';
import { AppConfigService } from '../../config/app-config.service';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export type LoginResult =
  | { requiereMfa: true; mensaje: string }
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
    };

function elegirRolPrincipal(roles: { rol: { codigo: string; esInterno: boolean } }[]): string | null {
  const rolInterno = roles.find((r) => r.rol.esInterno);
  if (rolInterno) return rolInterno.rol.codigo;

  const primerRol = roles[0];
  return primerRol ? primerRol.rol.codigo : null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly loginThrottle: LoginThrottleService,
    private readonly encryptionService: EncryptionService,
    private readonly emailService: EmailService,
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

  async login(dto: LoginDto, meta: RequestMeta): Promise<LoginResult> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correoElectronico: dto.correo },
      include: { roles: { include: { rol: true } } },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    await this.loginThrottle.assertNotLocked(usuario.id);

    const match = await this.passwordService.verify(
      usuario.contrasenaHash,
      dto.password,
    );
    if (!match) {
      await this.loginThrottle.registrarIntentoFallido(usuario.id);
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (usuario.estado !== 'APROBADO') {
      throw new UnauthorizedException('Su cuenta aún no ha sido aprobada.');
    }

    if (usuario.dobleFactorActivo) {
      if (!usuario.secretoTotp) {
        throw new BadRequestException('El usuario tiene MFA marcado como activo pero no tiene un secreto TOTP configurado.');
      }

      if (!dto.codigoMfa) {
        return { requiereMfa: true, mensaje: 'Ingrese su código de autenticación de dos factores.' };
      }

      const secretoDesencriptado = this.encryptionService.decrypt(usuario.secretoTotp);
      authenticator.options = { window: 4 };
      const isValid = authenticator.check(dto.codigoMfa.trim(), secretoDesencriptado);

      if (!isValid) {
        await this.loginThrottle.registrarIntentoFallido(usuario.id);
        throw new UnauthorizedException('Código de autenticación inválido.');
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

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: result.userId },
      include: { roles: { include: { rol: true } } },
    });
    if (!usuario || usuario.estado !== 'APROBADO') {
      throw new UnauthorizedException('Usuario inactivo.');
    }

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

  async solicitarRecuperacionContrasena(correoOrDto: string | RecuperarContrasenaDto | SolicitudRecuperacionDto) {
    const mensajeGenerico = 'Si el correo electrónico está registrado en el sistema, recibirá las instrucciones para restablecer su contraseña.';
    try {
      const correoInput = typeof correoOrDto === 'string' ? correoOrDto : (correoOrDto as any).correo;
      const correoLimpio = (correoInput || '').trim().toLowerCase();
      if (!correoLimpio) return { ok: true, mensaje: mensajeGenerico };

      const usuario = await this.prisma.usuario.findFirst({
        where: { correoElectronico: correoLimpio },
      });

      if (!usuario) {
        return { ok: true, mensaje: mensajeGenerico };
      }

      const resetToken = this.tokenService.signAccessToken({
        sub: usuario.id.toString(),
        rol: 'RESET_PASSWORD',
        empresaId: null,
      });

      const enlace = `${this.config.frontendUrl}/restablecer-contrasena?token=${resetToken}`;
      await this.emailService.enviarRecuperacionContrasena(
        usuario.correoElectronico,
        usuario.nombreCompleto,
        enlace
      );

      return {
        ok: true,
        mensaje: mensajeGenerico,
      };
    } catch {
      return { ok: true, mensaje: mensajeGenerico };
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

    return { ok: true, mensaje: 'Contraseña restablecida exitosamente. Ya puede iniciar sesión con su nueva contraseña.' };
  }

  async restablecerContrasena(dto: RestablecerContrasenaDto | any) {
    if (dto.token && dto.nuevaContrasena) {
      return this.resetearContrasena(dto.token, dto.nuevaContrasena);
    }
    const token = dto.token;
    const nuevaClave = dto.contrasenaNueva || dto.nuevaContrasena;
    return this.resetearContrasena(token, nuevaClave);
  }
}
