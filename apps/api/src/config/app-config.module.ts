import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

/**
 * Módulo global: AppConfigService se usa en casi todos los módulos
 * (PrismaService, AuthModule, RlsContextMiddleware, EvidenciasModule, etc.).
 * Marcarlo @Global evita tener que importarlo manualmente en cada módulo
 * que lo necesite.
 */
@Global()
@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
