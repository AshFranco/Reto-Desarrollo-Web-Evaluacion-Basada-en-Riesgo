import { ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../../modules/auth/token.service';

const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];

/**
 * Aislamiento entre empresas para recursos que se piden por ID: los roles
 * internos ven todo; cualquier otro rol (Administrador de Empresa, Usuario
 * Delegado, o un rol futuro) solo puede acceder a recursos de SU empresa.
 * Se niega por defecto: si el recurso no tiene empresa o el usuario no tiene
 * `empresaId`, se rechaza.
 */
export function verificarAccesoEmpresa(user: JwtPayload, idEmpresaDelRecurso: bigint | null | undefined): void {
  if (ROLES_INTERNOS.includes(user.rol)) return;
  if (!user.empresaId || !idEmpresaDelRecurso || idEmpresaDelRecurso !== BigInt(user.empresaId)) {
    throw new ForbiddenException('No tiene acceso a este recurso.');
  }
}
