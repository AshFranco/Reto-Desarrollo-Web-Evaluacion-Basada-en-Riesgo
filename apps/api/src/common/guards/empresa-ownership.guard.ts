import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];

/**
 * Guard de "ownership" a nivel de aplicación, adaptado al esquema oficial:
 * `caso` y `evaluacion` ya no tienen `id_empresa` directo -- se llega a la
 * empresa vía `id_establecimiento` -> `establecimiento.id_empresa`.
 * `solicitud_bpm` sí conserva `id_empresa` directo.
 *
 * Primera capa de defensa (rápida); la Row-Level Security en Postgres es
 * la segunda capa, que actúa incluso si este guard tuviera un error.
 */
export function EmpresaOwnershipGuard(
  entidad: 'solicitudBpm' | 'caso' | 'evaluacion',
) {
  @Injectable()
  class OwnershipGuardMixin implements CanActivate {
    constructor(readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      const recursoId = request.params.id;

      if (!user) throw new ForbiddenException();
      if (ROLES_INTERNOS.includes(user.rol)) return true;
      if (!recursoId) return true;

      let empresaIdDelRecurso: bigint | null | undefined;

      if (entidad === 'solicitudBpm') {
        const registro = await this.prisma.solicitudBpm.findUnique({
          where: { id: BigInt(recursoId) },
          select: { idEmpresa: true },
        });
        empresaIdDelRecurso = registro?.idEmpresa;
      } else if (entidad === 'caso') {
        const registro = await this.prisma.caso.findUnique({
          where: { id: BigInt(recursoId) },
          select: { establecimiento: { select: { idEmpresa: true } } },
        });
        empresaIdDelRecurso = registro?.establecimiento.idEmpresa;
      } else if (entidad === 'evaluacion') {
        const registro = await this.prisma.evaluacion.findUnique({
          where: { id: BigInt(recursoId) },
          select: { establecimiento: { select: { idEmpresa: true } } },
        });
        empresaIdDelRecurso = registro?.establecimiento.idEmpresa;
      }

      const empresaIdUsuario = user.empresaId ? BigInt(user.empresaId) : null;

      if (!empresaIdDelRecurso || empresaIdDelRecurso !== empresaIdUsuario) {
        throw new ForbiddenException('No tiene acceso a este recurso.');
      }
      return true;
    }
  }

  return OwnershipGuardMixin;
}
