# Backend — Sistema PWA de Evaluación Basada en Riesgo (EBR/BPM)

Backend para la solución descrita en el SRS "Sistema PWA para Evaluación
Basada en Riesgo (EBR/BPM)". Implementa fielmente:

- La **Ficha de Inspección BPM (Revisión Final)**: 34 secciones, 45 ítems,
  puntaje C=1/CP=0.5/IT=0/N-A=excluido, criticidad C/M/Me asignada por el
  técnico durante la inspección, y la lógica exacta de aprobación.
- La **Hoja de Categorización de Establecimiento y Frecuencia de Inspección**:
  RE = Σ(puntaje × peso) de 6 factores, RP = mayor riesgo entre categorías de
  alimento elaboradas, RT = RP × RE, y la Matriz de Frecuencia de Inspección.
- La **Matriz de Riesgo de Alimentos**: catálogo CODEX de ~105 categorías con
  riesgo microbiológico/químico.

## Arquitectura

```
NestJS (TypeScript) + Prisma + PostgreSQL
├── src/
│   ├── main.ts                 # bootstrap: Helmet, HTTPS, CORS, validación global
│   ├── app.module.ts           # guards globales (JWT + RBAC), RLS middleware
│   ├── common/                 # guards, decoradores, filtros, servicios transversales
│   ├── config/                 # configuración tipada + validación de entorno
│   ├── prisma/                 # cliente Prisma + contexto RLS
│   └── modules/
│       ├── auth/                    # JWT, refresh rotativo, MFA, captcha, bloqueo de intentos
│       ├── usuarios/ empresas/      # gestión BPM
│       ├── solicitudes-bpm/ casos/  # RF-05, RF-06
│       ├── alertas-lapch/ denuncias/ # RF-08, RF-09
│       ├── asignaciones/ calendario/ # RF-10, RF-11
│       ├── formularios/ evaluaciones/ evidencias/ # RF-12 a RF-15
│       ├── motor-riesgo/ categorias-alimento/      # RF-14 (motor de riesgo)
│       └── informes/ expedientes/   # RF-16, RF-17, RF-19
└── prisma/
    ├── schema.prisma           # esquema completo (ambos flujos)
    ├── sql/hardening.sql       # RLS, CHECK constraints, triggers de bloqueo
    ├── seed.ts                 # carga los catálogos EXACTOS de los documentos
    └── seed-data/*.json        # datos extraídos de los 3 Excel oficiales
```

### Por qué esta arquitectura

- **NestJS**: estructura modular obligatoria (controllers/services/DTOs)
  que evita el "todo en un archivo" y hace el RBAC/validación declarativos.
- **Prisma + PostgreSQL**: tipado end-to-end, migraciones versionadas, y
  Postgres permite Row-Level Security real (Node/Express + un ORM más
  simple no ofrece esto de fábrica).
- **Snapshots históricos intencionales** (`puntajeAplicado`, `pesoAplicado`,
  `frecuencia`): si el catálogo de factores/opciones cambia en el futuro,
  las evaluaciones e informes ya cerrados NO se alteran retroactivamente.

## Checklist de seguridad implementado

| Requisito | Dónde |
|---|---|
| Eliminar secretos de git | `.gitignore`, `.env.example` sin valores reales |
| Clave pública / TLS a la BD | `sslmode=require` en `DATABASE_URL`, ver `.env.example` |
| Seguridad a nivel de fila (RLS) | `prisma/sql/hardening.sql` — políticas por tabla sensible |
| Cifrado de datos | `common/services/encryption.service.ts` (AES-256-GCM) |
| Forzar autenticación | `JwtAuthGuard` global (fail-closed), `@Public()` es la excepción explícita |
| Restringir acceso a registros | `EmpresaOwnershipGuard` + RLS (dos capas) |
| Bloquear manipulación de campos | `ValidationPipe({ whitelist, forbidNonWhitelisted })` en todos los DTOs |
| Proteger cookies | refresh token en cookie `httpOnly/secure/sameSite=strict`, ver `token.service.ts` |
| Hashear contraseñas | Argon2id, `password.service.ts` |
| Limitar logins | `LoginThrottleService` (bloqueo por cuenta) + `@Throttle` por IP en `auth.controller.ts` |
| Protección de bots | `captcha.service.ts` (verificación server-side de hCaptcha/reCAPTCHA) |
| Parametrización de consultas | Prisma (queries parametrizadas); `$executeRaw`/`$queryRaw` solo con template literals, nunca `Unsafe` |
| Validar entradas | `class-validator` en cada DTO |
| Escapar contenido de usuario | saneamiento recomendado en la capa de presentación/informe (ver nota abajo) |
| Restringir archivos | `FileValidationPipe` (magic bytes reales, no MIME declarado) + `StorageService` (nombres opacos) |
| Cabeceras de seguridad | `helmet()` en `main.ts` (CSP, HSTS, X-Frame-Options, etc.) |
| Forzar HTTPS | `HttpsRedirectMiddleware` + `Strict-Transport-Security` |
| Ocultar / limitar APIs | prefijo `/api`, versionado `/v1`, `ThrottlerGuard` global |

> **Nota sobre "escapar contenido de usuario":** los campos de texto libre
> (observaciones, hallazgos, recomendaciones) se guardan tal cual en BD
> (Prisma parametriza, así que no hay inyección SQL). El escape para XSS
> corresponde a la capa que RENDERIZA ese contenido (frontend PWA o el
> generador de PDF del informe): usar siempre interpolación segura
> (React ya escapa por defecto; para el PDF, usar una librería de plantillas
> que escape HTML, nunca concatenar strings directamente).

## Puesta en marcha

```bash
cp .env.example .env
# Editar .env: generar todos los secretos, nunca dejar los valores de ejemplo.
#   openssl rand -base64 64   -> JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET
#   openssl rand -hex 32      -> DATA_ENCRYPTION_KEY

npm install
npx prisma migrate dev --name init
psql "$DIRECT_DATABASE_URL" -f prisma/sql/hardening.sql   # aplica RLS y triggers

# Provisionar el usuario de aplicación con privilegios mínimos (una vez, como superusuario):
#   ver los comandos comentados al inicio de prisma/sql/hardening.sql

SEED_ADMIN_EMAIL="admin@ejemplo.gob.do" SEED_ADMIN_PASSWORD="CambieEstaClave#2026" \
  npx prisma db seed

npm run start:dev
```

## Cómo verificar que funciona (paso a paso)

### 1. Compila sin errores de tipos
```bash
npm install
npx tsc --noEmit
```
Si algo falla aquí, es un error de tipos — arréglalo antes de seguir.

### 2. Corre el test del Motor de Riesgo (la lógica más crítica del sistema)
```bash
npm test
```
`test/motor-riesgo.spec.ts` verifica, con mocks, que RE/RP/RT y la
clasificación de frecuencia dan EXACTAMENTE los valores que da la hoja de
cálculo original en los casos límite (mejor caso, peor caso, y que RP tome
el mayor riesgo entre varias categorías de alimento). Si este test pasa, la
fórmula central del sistema es correcta independientemente de la base de datos.

### 3. Levanta PostgreSQL con Docker y prueba contra una base de datos real
```bash
docker compose up -d
docker compose ps        # debe decir "healthy"

cp .env.local.example .env   # valores de DESARROLLO, nunca usar en producción

npx prisma migrate dev --name init
npx prisma studio            # opcional: abre http://localhost:5555 y navega las tablas visualmente

# Aplica RLS y triggers de bloqueo (usa el mismo usuario, ya que en Docker
# es superusuario/owner por defecto — ver nota de RLS más abajo)
docker exec -i ebr_bpm_postgres psql -U postgres -d ebr_bpm < prisma/sql/hardening.sql

npx prisma db seed
```
Si el seed corre sin errores, verás en consola:
`✔ Ficha de Inspección BPM: 34 secciones, 45 ítems (total puntos posibles: 45)`
`✔ Catálogo de categorías de alimento (Matriz de Riesgo): 105`
`✔ Factores de riesgo del establecimiento: 6 (peso total: 1)`
— esa es la confirmación de que los 3 documentos originales se cargaron bien.

### 4. Levanta la app y corre el smoke test
```bash
npm run start:dev
```
En otra terminal:
```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh
```
Debe imprimir, en orden: `200`, `401`, `401`, `400`. Eso confirma que:
health responde, las rutas protegidas rechazan sin token (fail-closed),
login con credenciales inválidas da 401 (no 500 — no se filtran errores
internos), y el registro rechaza campos no declarados en el DTO.

### 5. Prueba el flujo real con el usuario admin sembrado
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@ebr.local","password":"AdminLocal#2026!","captchaToken":"test"}'
```
La verificación de captcha fallará contra el servidor real de hCaptcha con
un token falso — para probar login en local sin depender de un servicio
externo, comenta temporalmente la línea `await this.captchaService.verify(...)`
en `auth.service.ts` (nunca en un ambiente compartido/producción).

Con el `accessToken` que te devuelve, prueba:
```bash
TOKEN="<pega el accessToken aquí>"
curl http://localhost:3000/api/v1/formularios/vigente -H "Authorization: Bearer $TOKEN"
```
Debe devolver la ficha BPM completa con sus 34 secciones y 45 ítems.

### Nota sobre probar RLS localmente
En Docker, `postgres` es el *owner* de la base (rol creado por la imagen
oficial de Postgres), y los owners bypasean RLS salvo que la tabla tenga
`FORCE ROW LEVEL SECURITY` (ya está en `hardening.sql`) — pero un
**superusuario** siempre bypasea RLS sin importar el FORCE. Docker no marca
`postgres` como superusuario, así que el FORCE sí debería aplicar; aun
así, para una prueba 100% representativa de producción, crea un segundo rol
sin privilegios de owner y conéctate con él para confirmar que un
Administrador Empresa no puede ver filas de otra empresa aunque adivine el UUID.



## Despliegue en producción (checklist adicional)

1. El proceso Node **nunca** debe correr como root; usar un usuario de
   sistema dedicado sin privilegios.
2. Colocar el servicio detrás de un reverse proxy (nginx/ALB) que termine
   TLS y reenvíe `X-Forwarded-Proto`; `TRUST_PROXY=true` en `.env`.
3. Rotar `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` obliga a re-login de
   todos los usuarios: coordinar ventana de mantenimiento.
4. `DATA_ENCRYPTION_KEY` debe vivir en un secrets manager (AWS Secrets
   Manager, HashiCorp Vault, etc.), no solo en `.env` del servidor.
5. Configurar backups cifrados de PostgreSQL y probar la restauración.
6. Habilitar alertas sobre `log_auditoria` para patrones sospechosos
   (múltiples 403, ráfagas de login fallido, descargas masivas de expedientes).
