# 06 - Diseño de API REST

## 1. Objetivo

Documentar la API REST del sistema EBR/BPM tal como existe hoy en `main` (rama `feat/EBR-backend-api` fusionada vía PR #1, 2026-09-04), señalando qué está implementado y qué es todavía diseño propuesto.

## 2. Convenciones

- Base: `/api/v1` (`app.setGlobalPrefix('api')` + `VersioningType.URI`).
- JSON como formato principal.
- HTTPS obligatorio en producción (`HttpsRedirectMiddleware`, condicionado a `FORCE_HTTPS`).
- JWT en `Authorization: Bearer <token>` para el access token; refresh token en cookie `httpOnly`/`secure`/`sameSite=strict`, con alcance limitado a `/api/v1/auth`.
- Guard global `JwtAuthGuard`, fail-closed: toda ruta requiere autenticación salvo que esté decorada explícitamente con `@Public()`.
- `RolesGuard` global sobre `@Roles()`.
- `ThrottlerGuard` global: 100 solicitudes/minuto por IP, con límites más estrictos en rutas sensibles.

## 3. Recursos implementados (verificado en código)

### Autenticación — `auth`
```text
POST /api/v1/auth/registro       público, 5/hora
POST /api/v1/auth/login          público, 8/min, requiere captcha
POST /api/v1/auth/refresh        público, vía cookie firmada
POST /api/v1/auth/logout         autenticado
```
✅ Implementado: `POST /api/v1/auth/password/forgot` y `.../reset` (RF-01) en `auth.controller.ts`.

### Usuarios — `usuarios`
```text
GET   /api/v1/usuarios/registros/pendientes    ADMINISTRADOR
PATCH /api/v1/usuarios/registros/:id/resolver  ADMINISTRADOR
GET   /api/v1/usuarios/perfil                  autenticado
```

### Empresas — `empresas`
```text
POST  /api/v1/empresas          ADMINISTRADOR / COORDINADOR
GET   /api/v1/empresas          filtrado por empresa del usuario
GET   /api/v1/empresas/:id
PATCH /api/v1/empresas/:id      ADMIN_EMPRESA
```

### Establecimientos — `establecimientos`
```text
POST  /api/v1/establecimientos        ADMINISTRADOR_EMPRESA
GET   /api/v1/establecimientos        filtrado por empresa del usuario
GET   /api/v1/establecimientos/:id
PATCH /api/v1/establecimientos/:id    ADMINISTRADOR_EMPRESA
```
✅ Módulo implementado en `apps/api/src/modules/establecimientos/` (2026-09-18).

### Solicitudes BPM — `solicitudes-bpm`
```text
POST /api/v1/solicitudes-bpm             ADMIN_EMPRESA / USUARIO_DELEGADO — crea borrador
POST /api/v1/solicitudes-bpm/:id/enviar  con guard de pertenencia a empresa
GET  /api/v1/solicitudes-bpm/mias
```
✅ Completo a nivel de API.

### Programación institucional — `programacion-institucional`
```text
POST   /api/v1/programacion-institucional          # generado por el sistema, no por el usuario
GET    /api/v1/programacion-institucional
PATCH  /api/v1/programacion-institucional/:id/reprogramar
PATCH  /api/v1/programacion-institucional/:id/cancelar
```
✅ Completo.

### Casos — `casos`
```text
GET /api/v1/casos      filtrado por empresa si el rol no es interno
GET /api/v1/casos/:id  con guard de pertenencia
```
🟡 Solo lectura. La creación de casos vive en los módulos de origen (alertas-lapch, denuncias, solicitudes-bpm, programacion-institucional).

### Alertas LAPCH — `alertas-lapch`
```text
POST  /api/v1/alertas-lapch             ADMINISTRADOR / COORDINADOR — crea Caso en transacción
PATCH /api/v1/alertas-lapch/:id/resolver
GET   /api/v1/alertas-lapch
```
✅ Completo.

### Denuncias — `denuncias`
```text
POST  /api/v1/denuncias             crea Caso
PATCH /api/v1/denuncias/:id/resolver
GET   /api/v1/denuncias
```
✅ Completo.

### Asignaciones — `asignaciones`
```text
POST /api/v1/asignaciones       COORDINADOR / ADMINISTRADOR
GET  /api/v1/asignaciones/mias  TECNICO_EVALUADOR
```
✅ Básico funcional.

### Calendario — `calendario`
```text
GET /api/v1/calendario   TECNICO_EVALUADOR, por rango de fechas
```
✅ Solo consulta; la lógica de vistas día/semana/mes está implementada en el frontend.

### Formularios — `formularios`
```text
GET /api/v1/formularios/vigente   autenticado — ficha jerárquica
```
🟡 Solo lectura de catálogo.

### Evaluaciones — `evaluaciones`
```text
POST /api/v1/evaluaciones/:id/iniciar     TECNICO_EVALUADOR
POST /api/v1/evaluaciones/:id/respuestas
POST /api/v1/evaluaciones/:id/finalizar
GET  /api/v1/evaluaciones/:id/observaciones
POST /api/v1/evaluaciones/:id/corregir
POST /api/v1/evaluaciones/:id/reenviar
```
✅ Completo.

### Motor de riesgo — `motor-riesgo`
```text
POST /api/v1/motor-riesgo/calcular   ADMINISTRADOR / COORDINADOR / TECNICO_EVALUADOR
```
✅ El módulo más maduro. **Cierra el ciclo**: crea `ProgramacionInstitucional` y el `Caso` siguiente tras calcular.

### Categorías de alimento — `categorias-alimento`
```text
GET  /api/v1/categorias-alimento
POST /api/v1/categorias-alimento/asignar
GET  /api/v1/categorias-alimento/establecimiento/:id
```
✅ Completo.

### Evidencias — `evidencias`
```text
POST /api/v1/evidencias   multipart, validación por magic bytes, límite 15MB, TECNICO_EVALUADOR
```
🟡 Solo subida; almacenamiento real (`storage.service.ts`) no auditado a fondo.

### Expedientes — `expedientes`
```text
PATCH /api/v1/expedientes/:casoId/cerrar   COORDINADOR / ADMINISTRADOR
GET   /api/v1/expedientes                  búsqueda
GET   /api/v1/expedientes/:id/pdf
```
✅ Completo.

### Informes — `informes`
```text
POST  /api/v1/informes/generar                     TECNICO_EVALUADOR
PATCH /api/v1/informes/:evaluacionId/revisar        COORDINADOR / ADMINISTRADOR
GET   /api/v1/informes/:id/pdf
```
✅ Completo — generación de PDF implementada con `pdfkit` (`PdfService`).

## 4. Recursos implementados adicionalmente

*(Todos los recursos propuestos han sido movidos a la sección de implementados)*

## 5. Respuesta de error estándar (propuesta)

```json
{
  "code": "EVALUACION_BLOQUEADA",
  "message": "La evaluación ya fue enviada y sus datos están bloqueados.",
  "details": []
}
```
No verificado si el backend actual ya sigue esta convención de forma consistente en todos los módulos — a auditar.

## 6. Códigos HTTP esperados

`200 OK` · `201 Created` · `204 No Content` · `400 Bad Request` · `401 Unauthorized` · `403 Forbidden` · `404 Not Found` · `409 Conflict` · `422 Unprocessable Entity` · `500 Internal Server Error`.

## 7. Reglas críticas de la API

- Nunca confiar en el cliente para el cálculo de riesgo: el servidor es la autoridad final (aunque el cliente offline pueda mostrar un cálculo local con `packages/risk-engine`).
- Una evaluación bloqueada rechaza cualquier escritura sobre sus respuestas — reforzado tanto por el trigger SQL como (idealmente) por el guard de aplicación.
- Validar roles en backend, nunca confiar en que el frontend oculte una opción.
- No exponer stack traces ni SQL en las respuestas de error (`AllExceptionsFilter` ya implementado).
- Todo endpoint de escritura sobre `caso`, `evaluacion` o `calculo_riesgo` debe ser transaccional.

## 8. Pendientes de diseño

- Contratos DTO definitivos para los recursos propuestos en §4.
- Paginación y filtros consistentes en los endpoints de listado (`GET /casos`, `GET /expedientes`, etc.).
- Especificación OpenAPI/Swagger — no se verificó si existe ya en la rama actual.
- Idempotencia explícita en endpoints usados desde el cliente offline (relevante para cuando exista sincronización real).
- Rate limiting específico por endpoint más allá de auth/registro (hoy solo cubiertos explícitamente).
