import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Filtro global: garantiza que NUNCA se filtren detalles internos al cliente
 * (stack traces, consultas SQL, rutas de archivo, nombres de columnas, etc.).
 * Los detalles reales se registran solo en el log del servidor.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Ha ocurrido un error interno.';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as any)?.message ?? exception.message);
      code = (res as any)?.code ?? HttpStatus[status];
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Traduce errores de BD a mensajes genéricos: nunca exponer el detalle SQL.
      status = HttpStatus.CONFLICT;
      code = 'DATA_CONFLICT';
      message = 'La operación no pudo completarse por una restricción de datos.';
    }

    this.logger.error(
      `${request.method} ${request.originalUrl} -> ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      statusCode: status,
      code,
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
