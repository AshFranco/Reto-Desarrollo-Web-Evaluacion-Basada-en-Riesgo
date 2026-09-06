# 11 - Estrategia de Despliegue

## 1. Objetivo

Definir la estrategia de despliegue del sistema EBR/BPM. **Estado real: el proyecto opera hoy únicamente en entorno de desarrollo local vía Docker Compose. No hay estrategia de staging ni producción definida todavía**, pese a que la entrega es el 25 de septiembre de 2026.

## 2. Entorno de desarrollo — el único que existe hoy

Definido en `docker-compose.yml` (raíz del repositorio):

| Servicio | Imagen/versión | Puerto local |
|---|---|---|
| PostgreSQL | 16-alpine | 5432 |
| MinIO (consola) | — | 9001 (almacenamiento de evidencias tipo S3) |
| Mailhog | — | 8025 (correo de pruebas) |

Arranque:
```bash
git clone https://github.com/AshFranco/Reto-Desarrollo-Web-Evaluacion-Basada-en-Riesgo.git ebr-bpm && cd ebr-bpm
git config core.hooksPath .githooks
git config user.name  "Tu Nombre"
git config user.email "tu.correo@ejemplo.com"
cp .env.example .env
docker compose up -d
```

La base de datos queda con el esquema, los catálogos y los datos reales de los tres Excel ya cargados al levantar el contenedor de PostgreSQL (los scripts de `db/` se ejecutan en orden).

> **Nota de discrepancia a resolver:** existe un `docker-compose.yml` propio dentro de `apps/api/` (rama sin fusionar), cuyo contenido no fue auditado a fondo. Antes de fusionar esa rama, hay que confirmar si es redundante con el de la raíz o si define servicios adicionales necesarios para el backend.

## 3. Componentes a desplegar (cuando exista una estrategia formal)

- Backend NestJS (`apps/api`) — hoy solo corre localmente, sin imagen de contenedor de producción verificada.
- Frontend React + Vite PWA (`apps/web`) — no existe todavía.
- PostgreSQL 16 con el esquema `ebr`.
- Almacenamiento de evidencias (MinIO en desarrollo; en producción, probablemente un servicio S3-compatible gestionado — no decidido).
- Servicio de correo/SMS si se activan las integraciones opcionales del SRS.

## 4. Configuración vía variables de entorno

`.env.example` documenta las variables necesarias. Entre las críticas ya validadas al arranque del backend (ver `07-SEGURIDAD.md` §13): `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` (mínimo 32 caracteres cada una), `DATA_ENCRYPTION_KEY` (hexadecimal de 64 caracteres). El proceso no arranca si falta alguna.

Nombres de variables adicionales pendientes de definir para producción: proveedor de almacenamiento, proveedor de correo, orígenes permitidos de CORS por ambiente, claves de captcha.

## 5. Seguridad de despliegue

Aplicable cuando exista un pipeline real hacia staging/producción:

- TLS obligatorio (`FORCE_HTTPS` ya soportado en código, ver `07-SEGURIDAD.md` §5).
- Secretos fuera del repositorio, gestionados vía variables de entorno o un gestor de secretos dedicado — no decidido cuál.
- Acceso administrativo restringido a la infraestructura.
- Backups cifrados de PostgreSQL.
- Separación real entre ambientes de desarrollo, staging y producción — hoy solo existe desarrollo.

## 6. Base de datos en producción

Puntos a decidir antes de cualquier despliegue real:

- Estrategia de migración: hoy conviven dos fuentes de DDL no sincronizadas (`db/*.sql` versionado a mano, y una migración Prisma autogenerada en la rama del backend — ver `05-MODELO-DATOS.md` §6). Hay que decidir cuál gobierna las migraciones de producción antes de desplegar nada.
- Backups automáticos y pruebas de restauración — no definidos.
- Monitoreo de capacidad y control de acceso — no definidos.

## 7. Observabilidad

`nestjs-pino` está entre las dependencias del backend (logging estructurado), pero no se verificó su configuración real ni si hay algún destino de agregación de logs. No existen health checks, métricas ni alertas configuradas todavía.

## 8. CI/CD

**Estado real:** el único pipeline que existe (`.github/workflows/ci.yml`) valida `packages/risk-engine` (compilación + pruebas) y `db/*.sql` (carga de esquema + pruebas SQL), más la política de autoría de commits. **No hay ningún job de CI para `apps/api`**, y no existe ningún pipeline de despliegue (CD) hacia ningún ambiente.

Propuesta a futuro, una vez que `apps/api` tenga pruebas automatizadas:
```text
Commit/PR
   |
Build (risk-engine + api)
   |
Tests (vitest + pruebas SQL + pruebas de api, cuando existan)
   |
Chequeos de seguridad (dependencias, secretos)
   |
Artefacto
   |
Despliegue a staging
   |
Aprobación
   |
Despliegue a producción
```

## 9. Aplicación web (PWA)

No aplicable todavía — no existe frontend. Cuando se construya, deberá considerarse: build optimizado para PWA con service worker, configuración de API por ambiente, y pruebas de instalación en dispositivo real antes de cualquier despliegue.

## 10. Alta disponibilidad

El SRS no exige explícitamente un SLA de disponibilidad continua para este proyecto (a diferencia de otros sistemas del dominio). Aun así, dado que el cliente es una entidad gubernamental de salud pública (DIGEMAPS) con fecha de entrega fija, se recomienda definir antes de producción: ventanas de mantenimiento aceptables, estrategia de respaldo, y tiempo de recuperación esperado ante un fallo del servicio.

## 11. Pendientes críticos antes de cualquier despliegue real

1. Decidir si se fusiona `feat/EBR-backend-api` y en qué condiciones (ver `12-PLANIFICACION.md`).
2. Reconciliar las dos fuentes de DDL de base de datos.
3. Definir proveedor de infraestructura — no decidido en ningún documento del repositorio.
4. Construir el pipeline de CI para `apps/api` (hoy inexistente).
5. Resolver A-01, A-02 y A-07 — desplegar con supuestos bloqueantes sin resolver expone al sistema a recalcular mal el riesgo de establecimientos reales.
