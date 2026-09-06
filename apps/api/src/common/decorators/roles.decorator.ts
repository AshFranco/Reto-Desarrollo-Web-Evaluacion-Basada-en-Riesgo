import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '../enums';

export const ROLES_KEY = 'roles';

/**
 * Declara qué roles pueden acceder a un endpoint. Usar SIEMPRE junto con
 * @UseGuards(JwtAuthGuard, RolesGuard) — nunca confiar solo en el frontend
 * para ocultar botones/rutas.
 */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
