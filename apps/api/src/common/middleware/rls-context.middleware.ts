import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Antes de cada request, si hay un access token válido, fija
 * app.current_user_id / app.current_user_role en la sesión de Postgres.
 * Esto es la SEGUNDA capa de defensa (además de los guards de NestJS):
 * aunque una consulta de un módulo "olvide" filtrar por usuario/empresa,
 * las políticas RLS en la base de datos igual restringen las filas visibles.
 *
 * Nota de despliegue: si se usa PgBouncer en modo "transaction pooling",
 * las variables de sesión (`set_config` con `is_local=true`) deben fijarse
 * dentro de la misma transacción que las consultas del request; ver
 * PrismaService.setRlsContext y el uso de `$transaction` en los repositorios
 * que dependen de RLS.
 */
@Injectable()
export class RlsContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      try {
        const payload = this.jwt.verify(token, {
          secret: this.config.jwtAccessSecret,
        });
        (req as any).authUser = payload;
        await this.prisma.setRlsContext(payload.sub, payload.rol, payload.empresaId ?? null);
      } catch {
        // Token inválido/expirado: no se fija contexto; el AuthGuard
        // rechazará la petición más adelante si la ruta lo requiere.
        await this.prisma.setRlsContext(null, null);
      }
    } else {
      await this.prisma.setRlsContext(null, null);
    }

    next();
  }
}
