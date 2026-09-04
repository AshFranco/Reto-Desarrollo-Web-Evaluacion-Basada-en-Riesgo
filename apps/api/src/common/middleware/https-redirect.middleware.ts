import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Fuerza HTTPS en todo el tráfico entrante.
 * Detrás de un proxy inverso (nginx/ALB/Cloudflare) se confía en X-Forwarded-Proto,
 * por eso 'trust proxy' debe estar habilitado en main.ts.
 */
@Injectable()
export class HttpsRedirectMiddleware implements NestMiddleware {
  use = (req: Request, res: Response, next: NextFunction) => {
    const isSecure =
      req.secure || req.headers['x-forwarded-proto'] === 'https';

    if (!isSecure) {
      const host = req.headers.host;
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    next();
  };
}
