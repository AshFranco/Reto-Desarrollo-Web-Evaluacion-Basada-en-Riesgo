import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { TokenService } from '../src/modules/auth/token.service';
import { LoginThrottleService } from '../src/modules/auth/login-throttle.service';
import { PasswordService } from '../src/modules/auth/password.service';
import { RegistroUsuarioDto, RolRegistrable } from '../src/modules/auth/dto/registro-usuario.dto';
import { authenticator } from 'otplib';

describe('Auth & Token Services', () => {
  let authService: AuthService;
  let tokenService: TokenService;
  let prismaMock: any;
  let passwordServiceMock: any;
  let loginThrottleMock: any;
  let emailServiceMock: any;
  let encryptionServiceMock: any;
  let jwtServiceMock: any;
  let configMock: any;

  beforeEach(() => {
    prismaMock = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      empresa: { findUnique: jest.fn() },
      rol: { findUnique: jest.fn() },
      usuario: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    passwordServiceMock = {
      hash: jest.fn().mockResolvedValue('$argon2id$hashed_password'),
      verify: jest.fn(),
    };

    loginThrottleMock = {
      assertNotLocked: jest.fn().mockResolvedValue(undefined),
      registrarIntentoFallido: jest.fn().mockResolvedValue(undefined),
      registrarLoginExitoso: jest.fn().mockResolvedValue(undefined),
    };

    emailServiceMock = {
      enviarCorreo: jest.fn().mockResolvedValue({ ok: true, previewUrl: 'https://ethereal.email/test' }),
      enviarRecuperacionContrasena: jest.fn().mockResolvedValue({ ok: true, previewUrl: 'https://ethereal.email/test' }),
    };

    encryptionServiceMock = {
      encrypt: jest.fn().mockImplementation((v: string) => `cifrado.${v}`),
      decrypt: jest.fn().mockImplementation((v: string) => v.replace('cifrado.', '')),
    };

    jwtServiceMock = {
      sign: jest.fn().mockReturnValue('mocked.jwt.access_token'),
      verify: jest.fn(),
    };

    configMock = {
      jwtAccessSecret: 'test-secret',
      jwtAccessExpiresIn: '15m',
      cookieDomain: 'localhost',
      frontendUrl: 'http://localhost:5173',
      loginMaxAttempts: 5,
      loginLockMinutes: 15,
    };

    tokenService = new TokenService(jwtServiceMock, configMock as any, prismaMock);
    authService = new AuthService(
      prismaMock,
      passwordServiceMock,
      tokenService,
      loginThrottleMock,
      emailServiceMock,
      encryptionServiceMock,
      configMock as any,
    );
  });

  describe('TokenService', () => {
    it('signAccessToken firma correctamente el payload', () => {
      const payload = { sub: '123', rol: 'ADMINISTRADOR', empresaId: '456' };
      const token = tokenService.signAccessToken(payload);
      expect(token).toBe('mocked.jwt.access_token');
      expect(jwtServiceMock.sign).toHaveBeenCalledWith(payload, {
        secret: 'test-secret',
        expiresIn: '15m',
      });
    });

    it('issueRefreshToken genera token aleatorio y persiste hash en base de datos', async () => {
      const rawToken = await tokenService.issueRefreshToken(100n, { userAgent: 'Jest', ip: '127.0.0.1' });
      expect(typeof rawToken).toBe('string');
      expect(rawToken.length).toBe(96); // 48 bytes in hex
      expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          idUsuario: 100n,
          userAgent: 'Jest',
          ip: '127.0.0.1',
          tokenHash: expect.any(String),
          expiraEn: expect.any(Date),
        }),
      });
    });

    it('rotateRefreshToken rota exitosamente un token vigente', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 1n,
        idUsuario: 50n,
        revocado: false,
        expiraEn: futureDate,
      });

      const result = await tokenService.rotateRefreshToken('raw-token', { userAgent: 'Jest' });
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(50n);
      expect(typeof result?.newRawToken).toBe('string');

      // Se marca el token viejo como revocado
      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { revocado: true },
      });
    });

    it('rotateRefreshToken detecta reuso o expiración y revoca todas las sesiones en cascada', async () => {
      // Caso: Token ya revocado
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 2n,
        idUsuario: 50n,
        revocado: true,
        expiraEn: new Date(Date.now() + 10000),
      });

      const result = await tokenService.rotateRefreshToken('reused-token', {});
      expect(result).toBeNull();
      // Revocación en cascada para todo el usuario
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { idUsuario: 50n },
        data: { revocado: true },
      });
    });

    it('revokeAllForUser revoca todos los tokens del usuario', async () => {
      await tokenService.revokeAllForUser(77n);
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { idUsuario: 77n },
        data: { revocado: true },
      });
    });
  });

  describe('AuthService - Registro', () => {
    const dtoRegistro: RegistroUsuarioDto = {
      empresaId: '10',
      rol: RolRegistrable.ADMINISTRADOR_EMPRESA,
      correo: 'test@empresa.com',
      cedulaPasaporte: '001-0000000-1',
      nombreCompleto: 'Juan Perez',
      telefono: '809-555-0000',
      password: 'Password123!',
    };

    it('falla si la empresa indicada no existe', async () => {
      prismaMock.empresa.findUnique.mockResolvedValue(null);

      await expect(authService.registrar(dtoRegistro)).rejects.toThrow(BadRequestException);
    });

    it('falla si el rol indicado no existe', async () => {
      prismaMock.empresa.findUnique.mockResolvedValue({ id: 10n });
      prismaMock.rol.findUnique.mockResolvedValue(null);

      await expect(authService.registrar(dtoRegistro)).rejects.toThrow(BadRequestException);
    });

    it('falla si ya existe un usuario con el mismo correo o cédula', async () => {
      prismaMock.empresa.findUnique.mockResolvedValue({ id: 10n });
      prismaMock.rol.findUnique.mockResolvedValue({ id: 1 });
      prismaMock.usuario.findFirst.mockResolvedValue({ id: 1n });

      await expect(authService.registrar(dtoRegistro)).rejects.toThrow(BadRequestException);
    });

    it('registra exitosamente con estado inicial PENDIENTE_VALIDACION y hash de contraseña', async () => {
      prismaMock.empresa.findUnique.mockResolvedValue({ id: 10n });
      prismaMock.rol.findUnique.mockResolvedValue({ id: 1 });
      prismaMock.usuario.findFirst.mockResolvedValue(null);
      prismaMock.usuario.create.mockResolvedValue({
        id: 99n,
        correoElectronico: dtoRegistro.correo,
        nombreCompleto: dtoRegistro.nombreCompleto,
      });

      const res = await authService.registrar(dtoRegistro);
      expect(res.usuario.id).toBe('99');
      expect(passwordServiceMock.hash).toHaveBeenCalledWith(dtoRegistro.password);
      expect(prismaMock.usuario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          estado: 'PENDIENTE_VALIDACION',
          idEmpresa: 10n,
          contrasenaHash: '$argon2id$hashed_password',
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('AuthService - Login', () => {
    const dtoLogin = { correo: 'test@empresa.com', password: 'Password123!' };

    it('falla con Unauthorized si el usuario no existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      await expect(authService.login(dtoLogin, {})).rejects.toThrow(UnauthorizedException);
    });

    it('falla si el usuario no tiene estado APROBADO', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 5n,
        estado: 'PENDIENTE_VALIDACION',
        roles: [{ rol: { codigo: 'TECNICO_EVALUADOR' } }],
      });

      await expect(authService.login(dtoLogin, {})).rejects.toThrow(UnauthorizedException);
    });

    it('registra intento fallido si la contraseña es incorrecta', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 5n,
        estado: 'APROBADO',
        contrasenaHash: 'hash',
        roles: [{ rol: { codigo: 'TECNICO_EVALUADOR' } }],
      });
      passwordServiceMock.verify.mockResolvedValue(false);

      await expect(authService.login(dtoLogin, {})).rejects.toThrow(UnauthorizedException);
      expect(loginThrottleMock.registrarIntentoFallido).toHaveBeenCalledWith(5n);
    });

    it('retorna requiereMfa si tiene dobleFactorActivo y no se envía codigoMfa', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 5n,
        correoElectronico: 'test@empresa.com',
        estado: 'APROBADO',
        contrasenaHash: 'hash',
        dobleFactorActivo: true,
        roles: [{ rol: { codigo: 'TECNICO_EVALUADOR' } }],
      });
      passwordServiceMock.verify.mockResolvedValue(true);

      const res = await authService.login(dtoLogin, {});
      expect(res).toHaveProperty('requiereMfa', true);
      expect(res).toHaveProperty('mensaje');
    });

    it('permite login con dobleFactorActivo si se envía codigoMfa TOTP válido (RFC 6238)', async () => {
      const secreto = authenticator.generateSecret();
      const codigoTotpValido = authenticator.generate(secreto);

      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 5n,
        correoElectronico: 'test@empresa.com',
        estado: 'APROBADO',
        contrasenaHash: 'hash',
        nombreCompleto: 'Tecnico Pruebas',
        dobleFactorActivo: true,
        idEmpresa: null,
        roles: [{ rol: { codigo: 'TECNICO_EVALUADOR' } }],
      });
      prismaMock.$queryRaw.mockResolvedValue([{ secreto_totp: `cifrado.${secreto}` }]);
      passwordServiceMock.verify.mockResolvedValue(true);

      const res = await authService.login({ ...dtoLogin, codigoMfa: codigoTotpValido }, { userAgent: 'Jest' });
      expect(res).toHaveProperty('accessToken');
    });

    it('falla con UnauthorizedException si se envía codigoMfa incorrecto', async () => {
      const secreto = authenticator.generateSecret();

      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 5n,
        correoElectronico: 'test@empresa.com',
        estado: 'APROBADO',
        contrasenaHash: 'hash',
        dobleFactorActivo: true,
        roles: [{ rol: { codigo: 'TECNICO_EVALUADOR' } }],
      });
      prismaMock.$queryRaw.mockResolvedValue([{ secreto_totp: `cifrado.${secreto}` }]);
      passwordServiceMock.verify.mockResolvedValue(true);

      await expect(authService.login({ ...dtoLogin, codigoMfa: '000000' }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('login exitoso genera tokens y resetea throttle', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 5n,
        estado: 'APROBADO',
        contrasenaHash: 'hash',
        nombreCompleto: 'Tecnico Pruebas',
        dobleFactorActivo: false,
        idEmpresa: null,
        roles: [{ rol: { codigo: 'TECNICO_EVALUADOR' } }],
      });
      passwordServiceMock.verify.mockResolvedValue(true);

      const res = await authService.login(dtoLogin, { userAgent: 'Jest' });
      expect('accessToken' in res).toBe(true);
      if ('accessToken' in res) {
        expect(res.accessToken).toBe('mocked.jwt.access_token');
        expect(res.usuario.rol).toBe('TECNICO_EVALUADOR');
      }
      expect(loginThrottleMock.registrarLoginExitoso).toHaveBeenCalledWith(5n);
    });
  });

  describe('AuthService - Recuperación de Contraseña (RF-01)', () => {
    it('solicitarRecuperacionContrasena despacha correo con enlace de restablecimiento', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 10n,
        correoElectronico: 'usuario@digemaps.gob.do',
        nombreCompleto: 'Usuario Prueba',
        contrasenaHash: '$argon2id$v=19$m=65536,t=3,p=4$abcde12345',
        estado: 'APROBADO',
      });

      const res = await authService.solicitarRecuperacionContrasena({ correo: 'usuario@digemaps.gob.do' });
      expect(res.ok).toBe(true);
      expect(emailServiceMock.enviarRecuperacionContrasena).toHaveBeenCalledWith(
        'usuario@digemaps.gob.do',
        'Usuario Prueba',
        expect.stringContaining('/restablecer-contrasena?token='),
      );
    });

    it('solicitarRecuperacionContrasena no revela si el usuario no existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      const res = await authService.solicitarRecuperacionContrasena({ correo: 'inexistente@digemaps.gob.do' });
      expect(res.ok).toBe(true);
      expect(emailServiceMock.enviarRecuperacionContrasena).not.toHaveBeenCalled();
    });

    it('restablecerContrasena valida token, actualiza hash y revoca sesiones', async () => {
      jwtServiceMock.verify = jest.fn().mockReturnValue({
        sub: '10',
        pwh: 'abcde12345',
        purpose: 'pwd_reset',
      });

      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 10n,
        contrasenaHash: '$argon2id$v=19$m=65536,t=3,p=4$abcde12345',
        estado: 'APROBADO',
      });
      passwordServiceMock.verify.mockResolvedValue(false); // nueva contraseña es distinta

      const res = await authService.restablecerContrasena({
        token: 'token-valido',
        contrasenaNueva: 'NuevaClave2026!',
        confirmacion: 'NuevaClave2026!',
      });

      expect(res.ok).toBe(true);
      expect(prismaMock.usuario.update).toHaveBeenCalledWith({
        where: { id: 10n },
        data: { contrasenaHash: '$argon2id$hashed_password' },
      });
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { idUsuario: 10n },
        data: { revocado: true },
      });
    });
  });

  describe('AuthService - Logout', () => {
    it('logout revoca todos los tokens del usuario', async () => {
      await authService.logout('42');
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { idUsuario: 42n },
        data: { revocado: true },
      });
    });
  });
});
