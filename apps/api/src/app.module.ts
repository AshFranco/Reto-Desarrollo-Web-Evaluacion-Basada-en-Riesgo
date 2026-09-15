import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';

import { validate } from './config/env.validation';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { PrismaModule } from './prisma/prisma.module';
import { RlsContextMiddleware } from './common/middleware/rls-context.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { EmpresasModule } from './modules/empresas/empresas.module';
import { EstablecimientosModule } from './modules/establecimientos/establecimientos.module';
import { SolicitudesBpmModule } from './modules/solicitudes-bpm/solicitudes-bpm.module';
import { CasosModule } from './modules/casos/casos.module';
import { AlertasLapchModule } from './modules/alertas-lapch/alertas-lapch.module';
import { DenunciasModule } from './modules/denuncias/denuncias.module';
import { AsignacionesModule } from './modules/asignaciones/asignaciones.module';
import { CalendarioModule } from './modules/calendario/calendario.module';
import { FormulariosModule } from './modules/formularios/formularios.module';
import { EvaluacionesModule } from './modules/evaluaciones/evaluaciones.module';
import { MotorRiesgoModule } from './modules/motor-riesgo/motor-riesgo.module';
import { CategoriasAlimentoModule } from './modules/categorias-alimento/categorias-alimento.module';
import { EvidenciasModule } from './modules/evidencias/evidencias.module';
import { InformesModule } from './modules/informes/informes.module';
import { ExpedientesModule } from './modules/expedientes/expedientes.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate, // aborta el arranque si el .env es inválido
      envFilePath: ['.env', 'apps/api/.env'],
    }),

    AppConfigModule,

    // --- Rate limiting global (protección de bots / fuerza bruta / DoS básico) ---
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 500, // 500 peticiones/min por IP a nivel global para soportar SPA sin falsos positivos 429
      },
    ]),

    EventEmitterModule.forRoot(),

    // Necesario para que RlsContextMiddleware pueda decodificar el access
    // token y fijar el contexto de RLS antes de llegar a los guards.
    JwtModule.registerAsync({
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtAccessSecret,
      }),
      inject: [AppConfigService],
    }),

    PrismaModule,

    AuthModule,
    UsuariosModule,
    EmpresasModule,
    EstablecimientosModule,
    SolicitudesBpmModule,
    CasosModule,
    AlertasLapchModule,
    DenunciasModule,
    AsignacionesModule,
    CalendarioModule,
    FormulariosModule,
    EvaluacionesModule,
    MotorRiesgoModule,
    CategoriasAlimentoModule,
    EvidenciasModule,
    InformesModule,
    ExpedientesModule,
    CatalogosModule,
  ],
  controllers: [HealthController],
  providers: [
    RlsContextMiddleware,
    // Orden de guards: Throttler -> JwtAuth (fail-closed) -> Roles (RBAC).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Inyecta el usuario autenticado como variable de sesión de Postgres
    // para que las políticas de Row-Level Security se apliquen automáticamente.
    consumer.apply(RlsContextMiddleware).forRoutes('*');
  }
}
