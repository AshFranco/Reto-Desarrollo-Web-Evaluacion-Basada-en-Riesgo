import 'reflect-metadata';

// Node/Express usan JSON.stringify() para las respuestas, que NO sabe
// serializar BigInt de forma nativa (los IDs del esquema oficial son
// bigint). Este parche global evita que cualquier relación anidada no
// convertida manualmente a mano haga fallar la respuesta con
// "Do not know how to serialize a BigInt".
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import hpp from 'hpp';
import { AppModule } from './app.module';
import { HttpsRedirectMiddleware } from './common/middleware/https-redirect.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // No exponer stack traces del framework en logs de acceso.
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);

  // Confía en el proxy inverso (nginx/ALB) para IP real y detección de HTTPS.
  app.set('trust proxy', config.trustProxy);

  // --- Fuerza HTTPS antes de cualquier otro middleware ---
  if (config.forceHttps) {
    app.use(new HttpsRedirectMiddleware().use);
  }

  // --- Cabeceras de seguridad (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.) ---
  // En desarrollo, la CSP se relaja (sin bloquear <script>/<style> inline)
  // para que la interfaz de Swagger (/api/docs) funcione -- Swagger UI
  // necesita scripts y estilos inline que la CSP estricta bloquearía.
  // En producción se mantiene la política estricta de siempre.
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'blob:'],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      hsts: {
        maxAge: 63072000, // 2 años
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // --- Ocultar cabecera que delata el framework ---
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // --- Compresión de respuestas ---
  app.use(compression());

  // --- Previene HTTP Parameter Pollution en query strings ---
  app.use(hpp());

  // --- Cookies firmadas (para refresh token httpOnly) ---
  app.use(cookieParser(config.cookieSecret));

  // --- CORS restringido a orígenes explícitos, con credenciales para cookies ---
  app.enableCors({
    origin: config.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  // --- Versionado de API (permite evolución sin romper clientes PWA existentes) ---
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // --- Prefijo global: nunca exponer rutas "crudas" de recursos internos ---
  app.setGlobalPrefix('api');

  // --- Documentación interactiva de la API (solo fuera de producción) ---
  if (!config.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('EBR/BPM API')
      .setDescription(
        'Sistema PWA de Evaluación Basada en Riesgo — DIGEMAPS. ' +
          'Documentación interactiva de todos los endpoints del backend.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    // Sin esto, el botón "Authorize" registra el token pero Swagger no lo
    // adjunta a las peticiones de "Try it out" salvo que cada endpoint
    // tenga @ApiBearerAuth() individualmente. Esto lo aplica por defecto
    // a TODAS las rutas de una sola vez.
    document.security = [{ 'access-token': [] }];
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // --- Validación estricta de entradas: rechaza campos no declarados en el DTO ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina campos no declarados en el DTO (bloquea mass-assignment)
      forbidNonWhitelisted: true, // rechaza la petición si vienen campos extra (ej. intentar setear rol/estado)
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidUnknownValues: true,
    }),
  );

  // --- Filtro global: nunca filtrar detalles internos (stack, SQL, rutas de archivo) al cliente ---
  app.useGlobalFilters(new AllExceptionsFilter());

  // --- Apagado ordenado: cierra conexión a BD y libera recursos ---
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
}

bootstrap();
