import { AuditoriaService } from '../src/modules/auditoria/auditoria.service';
import { ProgramacionInstitucionalService } from '../src/modules/programacion-institucional/programacion-institucional.service';
import { EmpresasService } from '../src/modules/empresas/empresas.service';

describe('Gabriela Backend Integration Tests', () => {
  let prismaMock: any;
  let auditoriaService: AuditoriaService;
  let programacionService: ProgramacionInstitucionalService;
  let empresasService: EmpresasService;
  let passwordServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      auditoria: {
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 1n, ...args.data, fechaHora: new Date() })),
        findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      establecimiento: {
        findUnique: jest.fn(),
      },
      evaluacion: {
        findUnique: jest.fn(),
      },
      programacionInstitucional: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      origenCaso: {
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
      },
      caso: {
        create: jest.fn(),
      },
      usuario: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      rol: {
        findUnique: jest.fn(),
      },
      empresa: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    passwordServiceMock = {
      hash: jest.fn().mockResolvedValue('$argon2id$hashed'),
      verify: jest.fn().mockResolvedValue(true),
    };

    auditoriaService = new AuditoriaService(prismaMock);
    programacionService = new ProgramacionInstitucionalService(prismaMock, auditoriaService);
    empresasService = new EmpresasService(prismaMock, passwordServiceMock, auditoriaService);
  });

  describe('AuditoriaModule & AuditLog', () => {
    it('debe registrar logs de auditoría exitosamente con prisma.auditoria.create', async () => {
      const res = await auditoriaService.registrar({
        entidad: 'Evaluacion',
        idEntidad: '123',
        accion: 'GENERAR_REENVIAR_INFORME',
        idUsuario: '5',
        valoresNuevos: { hallazgos: 'Test' },
      });

      expect(prismaMock.auditoria.create).toHaveBeenCalled();
      expect(res).toHaveProperty('entidad', 'Evaluacion');
      expect(res).toHaveProperty('accion', 'GENERAR_REENVIAR_INFORME');
    });

    it('debe consultar la bitácora de auditoría con filtros', async () => {
      await auditoriaService.listar({ entidad: 'Evaluacion' });
      expect(prismaMock.auditoria.findMany).toHaveBeenCalled();
    });
  });

  describe('ProgramacionInstitucional (RF-07)', () => {
    it('debe crear programación e instituir caso asociado en ciclo cerrado', async () => {
      prismaMock.establecimiento.findUnique.mockResolvedValue({ id: 10n, nombre: 'Supermercado Central' });
      prismaMock.programacionInstitucional.create.mockResolvedValue({
        id: 100n,
        idEstablecimiento: 10n,
        fechaProgramada: new Date('2026-10-01'),
        frecuenciaAplicada: 'SEMESTRAL',
        prioridad: 'NORMAL',
      });
      // Codigo real del catalogo (db/02_seed_catalogos.sql): 'PROGRAMACION', no 'PROGRAMACION_INSTITUCIONAL'.
      prismaMock.origenCaso.findFirstOrThrow.mockImplementation(({ where }: any) => {
        if (where?.codigo !== 'PROGRAMACION') return Promise.reject(new Error('no encontrado'));
        return Promise.resolve({ id: 4, codigo: 'PROGRAMACION' });
      });
      prismaMock.caso.create.mockResolvedValue({
        id: 500n,
        idEstablecimiento: 10n,
        idOrigen: 4,
        idProgramacion: 100n,
        estado: 'BandejaEntrada',
      });

      const res = await programacionService.crear(
        {
          idEstablecimiento: '10',
          fechaProgramada: '2026-10-01',
          frecuenciaAplicada: 'SEMESTRAL',
          prioridad: 'NORMAL',
        },
        '1',
      );

      expect(prismaMock.programacionInstitucional.create).toHaveBeenCalled();
      expect(prismaMock.caso.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          idProgramacion: 100n,
          idOrigen: 4,
          estado: 'BandejaEntrada',
        }),
      });
      expect(res).toHaveProperty('id', '100');
    });
  });

  describe('Gestión de Delegados & Permisos Diferenciados (Item 6)', () => {
    it('debe invitar un usuario delegado vinculado a la empresa', async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(null);
      prismaMock.rol.findUnique.mockResolvedValue({ id: 2, codigo: 'USUARIO_DELEGADO' });
      prismaMock.usuario.create.mockResolvedValue({
        id: 77n,
        nombreCompleto: 'Delegado Maria',
        correoElectronico: 'delegado@empresa.com',
        cedulaPasaporte: '00112233445',
        estado: 'APROBADO',
      });

      const userAdminEmpresa: any = { sub: '10', rol: 'ADMINISTRADOR_EMPRESA', empresaId: '100' };

      const res = await empresasService.invitarDelegado(
        '100',
        {
          nombreCompleto: 'Delegado Maria',
          cedulaPasaporte: '00112233445',
          correoElectronico: 'delegado@empresa.com',
        },
        userAdminEmpresa,
      );

      expect(prismaMock.usuario.create).toHaveBeenCalled();
      expect(res).toHaveProperty('id', '77');
      expect(res).toHaveProperty('nombreCompleto', 'Delegado Maria');
    });

    it('debe cambiar el estado de un usuario delegado', async () => {
      prismaMock.usuario.findFirst.mockResolvedValue({
        id: 77n,
        idEmpresa: 100n,
        estado: 'APROBADO',
      });
      prismaMock.usuario.update.mockResolvedValue({
        id: 77n,
        nombreCompleto: 'Delegado Maria',
        estado: 'INACTIVO',
      });

      const userAdminEmpresa: any = { sub: '10', rol: 'ADMINISTRADOR_EMPRESA', empresaId: '100' };

      const res = await empresasService.cambiarEstadoDelegado(
        '100',
        '77',
        { estado: 'INACTIVO' },
        userAdminEmpresa,
      );

      expect(prismaMock.usuario.update).toHaveBeenCalledWith({
        where: { id: 77n },
        data: { estado: 'INACTIVO' },
      });
      expect(res).toHaveProperty('estado', 'INACTIVO');
    });
  });
});
