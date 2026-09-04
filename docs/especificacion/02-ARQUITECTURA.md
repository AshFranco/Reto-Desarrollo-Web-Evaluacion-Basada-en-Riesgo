# 02 - Arquitectura del Sistema

## 1. Objetivo

Definir la arquitectura técnica del sistema EBR/BPM a partir de las decisiones del equipo y del **estado real verificado del repositorio**, distinguiendo explícitamente qué existe hoy, qué vive en una rama sin fusionar, y qué es todavía una decisión propuesta sin implementar.

## 2. Estilo arquitectónico

Monorepo con separación cliente-servidor sobre API REST, más un paquete de dominio compartido entre cliente y servidor (el motor de riesgo). Esta última pieza es la decisión arquitectónica central del proyecto: el técnico necesita ver el puntaje en tiempo real sin conexión, y el servidor debe seguir siendo la autoridad final. Con una sola implementación importada por ambos lados, una corrección se aplica una vez y no puede divergir entre cliente y servidor.

## 3. Componentes principales

### 3.1 Motor de riesgo compartido — `packages/risk-engine`

**Estado: ✅ implementado y probado, en `main`.**

Paquete TypeScript (`decimal.js` para precisión decimal, `vitest` para pruebas) que expone las funciones de cálculo de riesgo. Es la **implementación única** — ninguna otra parte del sistema debe reimplementar estas fórmulas. Las funciones equivalentes en `db/05_funciones.sql` (PL/pgSQL) existen como verificación independiente, no como implementación paralela: el CI corre ambas suites de prueba por separado sobre los mismos 17 (TS) / 7 (SQL) casos.

Responsabilidades: cálculo de porcentaje de cumplimiento, RE (riesgo por evaluación), RP (riesgo del producto), RT (riesgo total), clasificación de frecuencia de inspección, y regla de aprobación. Ver `03-REQUISITOS.md` (RF-14) para las fórmulas exactas.

### 3.2 Base de datos — PostgreSQL, esquema `ebr`

**Estado: ✅ implementado en `main`, fuente de verdad del dominio.**

51 tablas en SQL versionado (`db/01_schema.sql` a `db/05_funciones.sql`), con los catálogos y datos reales de los tres archivos Excel de DIGEMAPS ya cargados: 90 nodos de ficha BPM (45 criterios evaluables), 17 categorías y 111 subcategorías de alimento, 6 factores de riesgo con 24 opciones. Incluye triggers de integridad (bloqueo de evaluación tras envío, validación de suma de pesos, prevención de ciclos en la jerarquía de la ficha) e índices únicos parciales para garantizar una sola versión publicada de la ficha y de la matriz de riesgo a la vez.

### 3.3 Backend — `apps/api`

**Estado: 🟡 implementado en rama `feat/EBR-backend-api`, no fusionado a `main`.**

NestJS + TypeScript + Prisma + PostgreSQL. 16 módulos que cubren la mayoría de los requisitos funcionales a nivel de API (ver `03-REQUISITOS.md` para el detalle módulo por módulo). Importa `packages/risk-engine` para el cálculo de riesgo, respetando la regla de implementación única.

**Advertencia arquitectónica activa:** el esquema Prisma de esta rama (`schema.prisma`, 43 modelos) diverge del esquema oficial de `main` (51 tablas) — faltan 6 tablas y sobran 3 no documentadas formalmente. Antes de considerar esta rama como la base del backend, hay que reconciliar ambos esquemas usando `db/01_schema.sql` como fuente de verdad. Ver `12-PLANIFICACION.md` §2.

### 3.4 Frontend web — `apps/web`

**Estado: ❌ no implementado en ninguna rama. Decisión de stack todavía sin ratificar formalmente.**

Propuesto como PWA en React + Vite con capacidades offline (el README general del repo lo describe así). El ADR-001 formal, en cambio, propone React 18 + MUI. Estas dos fuentes no están reconciliadas entre sí — es un punto a resolver antes de empezar el frontend, no solo un detalle de redacción, porque MUI y una configuración libre de estilos (compatible con Tailwind, por ejemplo) implican decisiones de proyecto distintas.

Responsabilidades previstas: dashboards por rol, gestión de empresas y solicitudes, ejecución de evaluaciones en campo con el motor de riesgo embebido para feedback en tiempo real, captura de evidencias, informes, y sincronización offline vía `operacion_pendiente` (la infraestructura de datos para esto ya existe en el esquema — ver `05-MODELO-DATOS.md` — pero no hay cliente que la consuma).

### 3.5 Infraestructura de soporte

Docker Compose (raíz del repo): PostgreSQL 16-alpine, MinIO (almacenamiento de evidencias tipo S3), Mailhog (correo de pruebas). La rama del backend trae además su propio `docker-compose.yml` en `apps/api/`, sin verificar si es redundante o complementario al de la raíz — a reconciliar.

## 4. Flujo lógico de comunicación

```text
[React + Vite PWA] ------\
   (no implementado)      \
                            >---- [API NestJS] ---- [PostgreSQL, esquema ebr]
[Cliente offline] --------/            |
   (no implementado)                   |---- [packages/risk-engine] (import compartido)
                                        |---- [MinIO] (evidencias)
                                        |---- [Mailhog / SMTP] (notificaciones, opcional)
```

## 5. Capas del backend (NestJS)

```text
Controllers (REST, /api/v1)
        |
Guards: JwtAuthGuard (fail-closed) + RolesGuard + ThrottlerGuard
        |
Services (reglas de negocio, orquestación)
        |
Prisma Client (persistencia) + packages/risk-engine (cálculo)
        |
PostgreSQL
```

## 6. Seguridad arquitectónica

Ver `07-SEGURIDAD.md` para el detalle completo con estado real (qué está implementado, qué está declarado pero roto). A nivel arquitectónico:

- JWT de acceso de corta duración + refresh token rotativo en cookie `httpOnly`/`secure`/`sameSite=strict`.
- RBAC vía guards globales.
- Row-Level Security a nivel de PostgreSQL como segunda capa de aislamiento de datos, complementaria al guard de aplicación — **declarada en el diseño pero no funcional hoy** (el archivo de políticas está vacío, pendiente de reescritura para el esquema de 51 tablas).
- Cifrado en tránsito (HTTPS forzado) y en reposo (AES-256-GCM para campos sensibles, implementación existente pero no auditada a fondo).

## 7. Disponibilidad y despliegue

Ver `11-DESPLIEGUE.md`. No hay todavía estrategia de despliegue a producción definida; el proyecto opera hoy solo en entorno de desarrollo local vía Docker Compose.

## 8. Principios de diseño (regla no negociable del equipo)

> **Ningún número del dominio se escribe en el código.** Ni 0.5, ni 0.56, ni 3.6, ni 60, ni 81. Si el número aparece en un Excel de la DIGEMAPS, va en una tabla.

Este principio está verificado como cumplido en `packages/risk-engine` (pesos y umbrales se leen de base de datos) y es la razón por la que columnas como `version_ficha.porcentaje_minimo_aprobacion` o `factor_riesgo_establecimiento.peso` existen como datos y no como constantes.

Otros principios aplicados: separación de responsabilidades, API como punto central de integración, transacciones para operaciones sensibles (creación de caso + registro de origen), independencia entre implementación cliente y servidor del motor de riesgo (pero sin duplicar lógica), configuración vía variables de entorno validadas al arranque.

## 9. Decisiones pendientes

| # | Decisión | Impacto | Estado |
|---|---|---|---|
| ADR-001 | Ratificar stack de backend (NestJS/Prisma vs. lo sugerido en plan-maestro) | Alto | Propuesto, no ratificado |
| — | Fusionar `feat/EBR-backend-api` a `develop`/`main`, y en qué condiciones | Alto | Pendiente — ver `12-PLANIFICACION.md` |
| — | Reconciliar `schema.prisma` (43 modelos) contra `db/01_schema.sql` (51 tablas) | Alto | Pendiente |
| — | React + MUI vs. React + Vite libre para el frontend | Medio | No reconciliado entre README y ADR-001 |
| — | Proveedor de hosting/infraestructura de producción | Medio | No definido |
| — | Estrategia CI/CD hacia producción | Medio | No definido (CI actual solo valida `risk-engine` y `db/*.sql`) |
