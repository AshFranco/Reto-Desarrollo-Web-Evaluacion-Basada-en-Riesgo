import { CasosService } from '../src/modules/casos/casos.service';
import { EmpresasService } from '../src/modules/empresas/empresas.service';

/**
 * Un usuario de empresa sin empresaId (recién registrado, antes de crear su
 * empresa) no debe ver datos de otras empresas: con el filtro vacío, Prisma
 * devolvería todo.
 */
describe('Listados para usuarios de empresa sin empresa asignada', () => {
  const sinEmpresa = [null, undefined, ''];
  const usuarioEmpresa = (empresaId: any) => ({ sub: '2', rol: 'ADMINISTRADOR_EMPRESA', empresaId }) as any;
  const interno = { sub: '1', rol: 'COORDINADOR', empresaId: null } as any;

  describe('CasosService', () => {
    let service: CasosService;
    let prismaMock: any;

    beforeEach(() => {
      prismaMock = { caso: { findMany: jest.fn().mockResolvedValue([]) } };
      service = new CasosService(prismaMock);
    });

    describe('listar', () => {
      it.each(sinEmpresa)('devuelve [] sin consultar cuando empresaId es %p', async (empresaId) => {
        expect(await service.listar(usuarioEmpresa(empresaId))).toEqual([]);
        expect(prismaMock.caso.findMany).not.toHaveBeenCalled();
      });

      it('filtra por la empresa del usuario', async () => {
        await service.listar(usuarioEmpresa('7'));
        expect(prismaMock.caso.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { establecimiento: { idEmpresa: 7n } } }),
        );
      });

      it('un rol interno ve todos los casos', async () => {
        await service.listar(interno);
        expect(prismaMock.caso.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      });
    });

    describe('buscarHistorico', () => {
      it.each(sinEmpresa)('devuelve [] sin consultar cuando empresaId es %p', async (empresaId) => {
        expect(await service.buscarHistorico({}, usuarioEmpresa(empresaId))).toEqual([]);
        expect(prismaMock.caso.findMany).not.toHaveBeenCalled();
      });

      it('fuerza la empresa del usuario e ignora la que mande en los filtros', async () => {
        await service.buscarHistorico({ empresaId: '99' }, usuarioEmpresa('7'));
        const where = prismaMock.caso.findMany.mock.calls[0][0].where;
        expect(where.establecimiento).toEqual({ idEmpresa: 7n });
      });

      it('un rol interno puede buscar sin filtro de empresa', async () => {
        await service.buscarHistorico({}, interno);
        const where = prismaMock.caso.findMany.mock.calls[0][0].where;
        expect(where.establecimiento).toBeUndefined();
      });
    });
  });

  describe('EmpresasService.listar', () => {
    let service: EmpresasService;
    let prismaMock: any;

    beforeEach(() => {
      prismaMock = { empresa: { findMany: jest.fn().mockResolvedValue([]) } };
      service = new EmpresasService(prismaMock, {} as any, {} as any);
    });

    it.each(sinEmpresa)('devuelve [] sin consultar cuando empresaId es %p', async (empresaId) => {
      expect(await service.listar(usuarioEmpresa(empresaId))).toEqual([]);
      expect(prismaMock.empresa.findMany).not.toHaveBeenCalled();
    });

    it('un usuario con empresa solo consulta la suya', async () => {
      await service.listar(usuarioEmpresa('7'));
      expect(prismaMock.empresa.findMany).toHaveBeenCalledWith({ where: { id: 7n } });
    });

    it('un rol interno lista todas las empresas', async () => {
      await service.listar(interno);
      expect(prismaMock.empresa.findMany).toHaveBeenCalledWith({ orderBy: { razonSocial: 'asc' } });
    });
  });
});
