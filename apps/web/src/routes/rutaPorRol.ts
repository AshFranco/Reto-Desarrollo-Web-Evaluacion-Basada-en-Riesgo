/**
 * A qué dashboard va cada rol después de iniciar sesión. Roles confirmados
 * contra apps/api/src/common/enums.ts (RolUsuario) — no inventados.
 */
export function rutaPorRol(rol: string): string {
  switch (rol) {
    case 'ADMINISTRADOR':
      return '/admin';
    case 'COORDINADOR':
      return '/coordinador';
    case 'TECNICO_EVALUADOR':
      return '/tecnico';
    case 'ADMINISTRADOR_EMPRESA':
    case 'USUARIO_DELEGADO':
      return '/empresa';
    default:
      return '/login';
  }
}
