import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { EmpresaOwnershipGuard } from '../src/common/guards/empresa-ownership.guard';
import { RolUsuario } from '../src/common/enums';

describe('Security & Multi-Tenant Guards', () => {
  describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflectorMock: any;

    beforeEach(() => {
      reflectorMock = {
        getAllAndOverride: jest.fn(),
      };
      guard = new RolesGuard(reflectorMock as Reflector);
    });

    function mockContext(user?: any): ExecutionContext {
      return {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      } as unknown as ExecutionContext;
    }

    it('permite acceso si no hay roles requeridos en la ruta', () => {
      reflectorMock.getAllAndOverride.mockReturnValue(undefined);
      const context = mockContext({ rol: RolUsuario.ADMINISTRADOR });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('permite acceso si el usuario tiene uno de los roles permitidos', () => {
      reflectorMock.getAllAndOverride.mockReturnValue([RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR]);
      const context = mockContext({ rol: RolUsuario.COORDINADOR });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('rechaza con ForbiddenException si el rol del usuario no está permitido', () => {
      reflectorMock.getAllAndOverride.mockReturnValue([RolUsuario.ADMINISTRADOR]);
      const context = mockContext({ rol: RolUsuario.TECNICO_EVALUADOR });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('rechaza con ForbiddenException si el usuario no está presente en la solicitud', () => {
      reflectorMock.getAllAndOverride.mockReturnValue([RolUsuario.ADMINISTRADOR]);
      const context = mockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('EmpresaOwnershipGuard (Aislamiento Multi-Empresa)', () => {
    let prismaMock: any;

    beforeEach(() => {
      prismaMock = {
        solicitudBpm: { findUnique: jest.fn() },
        caso: { findUnique: jest.fn() },
        evaluacion: { findUnique: jest.fn() },
      };
    });

    function mockContext(user: any, params: any): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user, params }),
        }),
      } as unknown as ExecutionContext;
    }

    it('permite acceso directo a roles internos sin consultar la entidad', async () => {
      const GuardClass = EmpresaOwnershipGuard('solicitudBpm');
      const guard = new GuardClass(prismaMock);
      const context = mockContext({ rol: 'COORDINADOR', empresaId: null }, { id: '10' });

      const allowed = await guard.canActivate(context);
      expect(allowed).toBe(true);
      expect(prismaMock.solicitudBpm.findUnique).not.toHaveBeenCalled();
    });

    it('permite si no hay ID de recurso en la ruta (ej. listados)', async () => {
      const GuardClass = EmpresaOwnershipGuard('caso');
      const guard = new GuardClass(prismaMock);
      const context = mockContext({ rol: 'ADMINISTRADOR_EMPRESA', empresaId: '100' }, {});

      const allowed = await guard.canActivate(context);
      expect(allowed).toBe(true);
    });

    describe('Entidad: solicitudBpm', () => {
      it('permite si la solicitud pertenece a la empresa del usuario', async () => {
        const GuardClass = EmpresaOwnershipGuard('solicitudBpm');
        const guard = new GuardClass(prismaMock);
        const context = mockContext({ rol: 'ADMINISTRADOR_EMPRESA', empresaId: '100' }, { id: '15' });

        prismaMock.solicitudBpm.findUnique.mockResolvedValue({ idEmpresa: 100n });

        const allowed = await guard.canActivate(context);
        expect(allowed).toBe(true);
      });

      it('rechaza con ForbiddenException si la solicitud pertenece a otra empresa (IDOR)', async () => {
        const GuardClass = EmpresaOwnershipGuard('solicitudBpm');
        const guard = new GuardClass(prismaMock);
        const context = mockContext({ rol: 'ADMINISTRADOR_EMPRESA', empresaId: '100' }, { id: '15' });

        prismaMock.solicitudBpm.findUnique.mockResolvedValue({ idEmpresa: 200n });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('Entidad: caso', () => {
      it('permite si el caso pertenece a la empresa del usuario a través del establecimiento', async () => {
        const GuardClass = EmpresaOwnershipGuard('caso');
        const guard = new GuardClass(prismaMock);
        const context = mockContext({ rol: 'USUARIO_DELEGADO', empresaId: '55' }, { id: '30' });

        prismaMock.caso.findUnique.mockResolvedValue({
          establecimiento: { idEmpresa: 55n },
        });

        const allowed = await guard.canActivate(context);
        expect(allowed).toBe(true);
      });

      it('rechaza con ForbiddenException si el caso pertenece a otra empresa', async () => {
        const GuardClass = EmpresaOwnershipGuard('caso');
        const guard = new GuardClass(prismaMock);
        const context = mockContext({ rol: 'USUARIO_DELEGADO', empresaId: '55' }, { id: '30' });

        prismaMock.caso.findUnique.mockResolvedValue({
          establecimiento: { idEmpresa: 999n },
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('Entidad: evaluacion', () => {
      it('permite si la evaluación pertenece a la empresa del usuario', async () => {
        const GuardClass = EmpresaOwnershipGuard('evaluacion');
        const guard = new GuardClass(prismaMock);
        const context = mockContext({ rol: 'ADMINISTRADOR_EMPRESA', empresaId: '77' }, { id: '50' });

        prismaMock.evaluacion.findUnique.mockResolvedValue({
          establecimiento: { idEmpresa: 77n },
        });

        const allowed = await guard.canActivate(context);
        expect(allowed).toBe(true);
      });

      it('rechaza si no se encuentra la evaluación o empresa no coincide', async () => {
        const GuardClass = EmpresaOwnershipGuard('evaluacion');
        const guard = new GuardClass(prismaMock);
        const context = mockContext({ rol: 'ADMINISTRADOR_EMPRESA', empresaId: '77' }, { id: '50' });

        prismaMock.evaluacion.findUnique.mockResolvedValue(null);

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });
    });
  });
});
