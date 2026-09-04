import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';

/**
 * Cliente Prisma central.
 *
 * Seguridad de la conexión:
 * - La URL de conexión exige `sslmode=require` (ver .env.example): la BD nunca
 *   se conecta en texto plano.
 * - El usuario de aplicación (postgres) NO es superusuario ni owner del
 *   esquema: solo tiene GRANTs explícitos por tabla (ver prisma/sql/rls.sql).
 * - Nunca se interpola texto de usuario en `$queryRawUnsafe`; todo query raw
 *   usa `$queryRaw`/`$executeRaw` con placeholders parametrizados.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly datosourceUrl: string;

  constructor(config: AppConfigService) {
    super({
      datasources: { db: { url: config.databaseUrl } },
      log:
        config.nodeEnv === 'development'
          ? ['warn', 'error']
          : ['error'],
    });
    this.datosourceUrl = config.databaseUrl;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida (TLS).');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Establece el usuario actual en la sesión de Postgres para esta conexión,
   * de modo que las políticas de Row-Level Security (RLS) puedan filtrar
   * filas usando `current_setting('app.current_user_id')` y
   * `current_setting('app.current_user_role')`.
   *
   * IMPORTANTE: se usa `set_config` parametrizado, nunca concatenación de
   * strings, para evitar inyección SQL vía estos valores.
   */
  async setRlsContext(
    userId: string | null,
    role: string | null,
    empresaId: string | null = null,
  ): Promise<void> {
    await this.$executeRaw`SELECT set_config('app.current_user_id', ${userId ?? ''}, true)`;
    await this.$executeRaw`SELECT set_config('app.current_user_role', ${role ?? ''}, true)`;
    await this.$executeRaw`SELECT set_config('app.current_empresa_id', ${empresaId ?? ''}, true)`;
  }
}
