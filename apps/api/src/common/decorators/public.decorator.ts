import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint como público. Por diseño, TODO endpoint requiere
 * autenticación salvo que se marque explícitamente con este decorador
 * (fail-closed: el default seguro es exigir login).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
