import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../src/modules/usuarios/usuarios.service';
import { authenticator } from 'otplib';

describe('UsuariosService — Mi Perfil, 2FA (TOTP) y Cambio de Contraseña (RF-01)', () => {
  let usuariosService: UsuariosService;
  let prismaMock: any;
  let passwordServiceMock: any;
  let tokenServiceMock: any;
  let encryptionServiceMock: any;
  let notificacionesMock: any;

  beforeEach(() => {
    prismaMock = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn(),
      usuario: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };

    passwordServiceMock = {
      hash: jest.fn().mockResolvedValue('$argon2id$nueva_hash'),
      verify: jest.fn(),
    };

    tokenServiceMock = {
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };

    encryptionServiceMock = {
      encrypt: jest.fn().mockImplementation((val: string) => `cifrado.${val}`),
      decrypt: jest.fn().mockImplementation((val: string) => val.replace('cifrado.', '')),
    };

    notificacionesMock = { crear: jest.fn() };

    usuariosService = new UsuariosService(
      prismaMock,
      passwordServiceMock,
      tokenServiceMock,
      encryptionServiceMock,
      notificacionesMock,
    );
  });

  describe('perfil', () => {
    it('retorna los datos del perfil del usuario autenticado', async () => {
      prismaMock.usuario.findUniqueOrThrow.mockResolvedValue({
        id: BigInt(42),
        nombreCompleto: 'Carlos Técnico',
        correoElectronico: 'carlos@digemaps.gob.do',
        telefono: '809-555-0100',
        roles: [{ rol: { codigo: 'TECNICO_EVALUADOR' } }],
        idEmpresa: null,
        dobleFactorActivo: false,
      });

      const res = await usuariosService.perfil('42');

      expect(res.id).toBe('42');
      expect(res.nombreCompleto).toBe('Carlos Técnico');
      expect(res.correoElectronico).toBe('carlos@digemaps.gob.do');
      expect(res.roles).toEqual(['TECNICO_EVALUADOR']);
      expect(res.idEmpresa).toBeNull();
    });
  });

  describe('actualizarPerfil', () => {
    it('actualiza teléfono y datos de perfil correctamente', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: BigInt(42), dobleFactorActivo: false });
      prismaMock.usuario.update.mockResolvedValue({ id: BigInt(42) });
      prismaMock.usuario.findUniqueOrThrow.mockResolvedValue({
        id: BigInt(42),
        nombreCompleto: 'Carlos Técnico',
        correoElectronico: 'carlos@digemaps.gob.do',
        telefono: '809-555-9999',
        roles: [{ rol: { codigo: 'TECNICO_EVALUADOR' } }],
        idEmpresa: null,
        dobleFactorActivo: false,
      });

      const res = await usuariosService.actualizarPerfil('42', {
        telefono: '809-555-9999',
      });

      expect(prismaMock.usuario.update).toHaveBeenCalledWith({
        where: { id: BigInt(42) },
        data: { telefono: '809-555-9999' },
      });
      expect(res.telefono).toBe('809-555-9999');
    });

    it('impide activar dobleFactorActivo directamente sin vinculación previa', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: BigInt(42), dobleFactorActivo: false });

      await expect(
        usuariosService.actualizarPerfil('42', {
          dobleFactorActivo: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2FA (TOTP) - Google Authenticator', () => {
    it('generar2Fa retorna secreto Base32 y código QR data URL', async () => {
      prismaMock.usuario.findUniqueOrThrow.mockResolvedValue({
        id: BigInt(42),
        correoElectronico: 'usuario@digemaps.gob.do',
        dobleFactorActivo: false,
      });

      const res = await usuariosService.generar2Fa('42');

      expect(res.secreto).toBeDefined();
      expect(typeof res.secreto).toBe('string');
      expect(res.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(res.otpauthUrl).toContain('otpauth://totp/');
      expect(res.correo).toBe('usuario@digemaps.gob.do');
    });

    it('activar2Fa guarda el secreto cifrado si el código TOTP es válido', async () => {
      prismaMock.usuario.findUniqueOrThrow.mockResolvedValue({
        id: BigInt(42),
        correoElectronico: 'usuario@digemaps.gob.do',
      });

      const secreto = authenticator.generateSecret();
      const codigoValido = authenticator.generate(secreto);

      const res = await usuariosService.activar2Fa('42', {
        secreto,
        codigo: codigoValido,
      });

      expect(res.ok).toBe(true);
      expect(encryptionServiceMock.encrypt).toHaveBeenCalledWith(secreto);
      expect(prismaMock.$executeRaw).toHaveBeenCalled();
    });

    it('activar2Fa rechaza con BadRequestException si el código TOTP es inválido', async () => {
      prismaMock.usuario.findUniqueOrThrow.mockResolvedValue({
        id: BigInt(42),
      });

      const secreto = authenticator.generateSecret();

      await expect(
        usuariosService.activar2Fa('42', {
          secreto,
          codigo: '000000',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('desactivar2Fa valida la contraseña actual y remueve el secreto', async () => {
      prismaMock.usuario.findUniqueOrThrow.mockResolvedValue({
        id: BigInt(42),
        contrasenaHash: '$argon2id$password_hash',
      });
      passwordServiceMock.verify.mockResolvedValue(true);

      const res = await usuariosService.desactivar2Fa('42', {
        contrasenaActual: 'ContraseñaCorrecta@123',
      });

      expect(res.ok).toBe(true);
      expect(prismaMock.$executeRaw).toHaveBeenCalled();
    });

    it('desactivar2Fa rechaza con UnauthorizedException si la contraseña es errónea', async () => {
      prismaMock.usuario.findUniqueOrThrow.mockResolvedValue({
        id: BigInt(42),
        contrasenaHash: '$argon2id$password_hash',
      });
      passwordServiceMock.verify.mockResolvedValue(false);

      await expect(
        usuariosService.desactivar2Fa('42', {
          contrasenaActual: 'ClaveIncorrecta',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('cambiarContrasena', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      await expect(
        usuariosService.cambiarContrasena('999', {
          contrasenaActual: 'Clave@123',
          contrasenaNueva: 'NuevaClave@456',
          confirmacion: 'NuevaClave@456',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza UnauthorizedException si la contraseña actual es incorrecta', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: BigInt(42),
        contrasenaHash: '$argon2id$hash_existente',
      });
      passwordServiceMock.verify.mockResolvedValueOnce(false); // actual inválida

      await expect(
        usuariosService.cambiarContrasena('42', {
          contrasenaActual: 'ClaveEquivocada@1',
          contrasenaNueva: 'NuevaClave@456',
          confirmacion: 'NuevaClave@456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza BadRequestException si la nueva contraseña es igual a la actual', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: BigInt(42),
        contrasenaHash: '$argon2id$hash_existente',
      });
      passwordServiceMock.verify
        .mockResolvedValueOnce(true) // actual válida
        .mockResolvedValueOnce(true); // nueva igual a la actual

      await expect(
        usuariosService.cambiarContrasena('42', {
          contrasenaActual: 'MismaClave@123',
          contrasenaNueva: 'MismaClave@123',
          confirmacion: 'MismaClave@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('actualiza la contraseña y revoca tokens en caso exitoso', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: BigInt(42),
        contrasenaHash: '$argon2id$hash_existente',
      });
      passwordServiceMock.verify
        .mockResolvedValueOnce(true) // actual válida
        .mockResolvedValueOnce(false); // nueva diferente

      prismaMock.usuario.update.mockResolvedValue({ id: BigInt(42) });

      const res = await usuariosService.cambiarContrasena('42', {
        contrasenaActual: 'ClaveValida@123',
        contrasenaNueva: 'NuevaSuperClave@789',
        confirmacion: 'NuevaSuperClave@789',
      });

      expect(passwordServiceMock.hash).toHaveBeenCalledWith('NuevaSuperClave@789');
      expect(prismaMock.usuario.update).toHaveBeenCalledWith({
        where: { id: BigInt(42) },
        data: { contrasenaHash: '$argon2id$nueva_hash' },
      });
      expect(tokenServiceMock.revokeAllForUser).toHaveBeenCalledWith(BigInt(42));
      expect(res.mensaje).toContain('Contraseña actualizada correctamente');
    });
  });

  describe('resolverRegistro', () => {
    it('notifica al usuario cuando su registro es aprobado', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: BigInt(7), estado: 'PENDIENTE_VALIDACION' });
      prismaMock.usuario.update.mockResolvedValue({ id: BigInt(7), estado: 'APROBADO', idEmpresa: null });

      await usuariosService.resolverRegistro('7', { decision: 'APROBADO' } as any);

      expect(notificacionesMock.crear).toHaveBeenCalledWith(
        expect.objectContaining({ idUsuario: BigInt(7), tipo: 'REGISTRO_APROBADO' }),
      );
    });

    it('notifica al usuario cuando su registro es rechazado, incluyendo el motivo', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: BigInt(8), estado: 'PENDIENTE_VALIDACION' });
      prismaMock.usuario.update.mockResolvedValue({ id: BigInt(8), estado: 'RECHAZADO', idEmpresa: null });

      await usuariosService.resolverRegistro('8', {
        decision: 'RECHAZADO',
        motivoRechazo: 'Documentación incompleta',
      } as any);

      expect(notificacionesMock.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          idUsuario: BigInt(8),
          tipo: 'REGISTRO_RECHAZADO',
          mensaje: expect.stringContaining('Documentación incompleta'),
        }),
      );
    });
  });
});
