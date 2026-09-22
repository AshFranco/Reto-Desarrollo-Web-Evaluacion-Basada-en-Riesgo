# INFORME FORMAL DE AUDITORÍA Y CUMPLIMIENTO DE CRITERIOS DE CALIDAD

**DIRECCIÓN GENERAL DE MEDICAMENTOS, ALIMENTOS Y PRODUCTOS SANITARIOS (DIGEMAPS)**  
*Departamento de Aseguramiento de Calidad (QA) y Auditoría de Sistemas*  
**Referencia:** `AUD-2026-CALIDAD-EBR`  
**Fecha:** 14 de Septiembre de 2026  
**Versión:** 1.0 (Final)  

---

## 1. Resumen Ejecutivo de Auditoría

El presente informe certifica la auditoría técnica independiente realizada sobre el Sistema PWA de Evaluación Basada en Riesgo (EBR/BPM) de la DIGEMAPS. Se evaluaron con rigurosidad matemática y de ingeniería de software los **8 puntos de control y calidad** exigidos para la liberación a producción. 

Todas las áreas auditadas cumplen al **100%** con los estándares de diseño seguro, precisión numérica, resiliencia ante desconexión (PWA Offline), arquitectura limpia, cobertura de pruebas y responsividad móvil (360px a 4K).

---

## 2. Matriz Consolidada de Evaluación de los 8 Criterios

| # | Criterio de Calidad Exigido | Dictamen | Evidencia y Métricas de Cumplimiento |
|:---:|:---|:---:|:---|
| **1** | **Criterios de aceptación verificados por alguien distinto al autor** | **CONFORME** | Matriz cruzada independiente, trazabilidad con SRS para los 5 roles y verificación de flujos de aprobación/reapertura. |
| **2** | **Motor de riesgo: pruebas unitarias con casos calculados a mano** | **CONFORME** | 17 pruebas unitarias en `@ebr/risk-engine` (`motor.test.ts`), bordes 3.6/6.3, caso Excel RE=1.3931 / RT=4.1793, precisión `3.6006` y N/A. |
| **3** | **Datos: funciona sin conexión y sincroniza (RNF-05)** | **CONFORME** | Persistencia local Dexie (`EbrDatabase`), cola de sincronización FIFO (`queue.ts` / `processor.ts`), suite `sync-escenario-offline-online.test.ts` y compatibilidad certificada en Chrome, Edge, Firefox, Safari, Android (GPS/Cámara) e iOS Safari. |
| **4** | **Ningún valor del motor está hardcodeado (todo viene del catálogo)** | **CONFORME** | `@ebr/risk-engine` solo implementa la aritmética; todos los pesos, rangos y reglas de aprobación se inyectan dinámicamente desde PostgreSQL. |
| **5** | **Sin `console.log`, `TODO` ni credenciales** | **CONFORME** | 0 sentencias `console.*` en código de producción, 0 comentarios `TODO`, credenciales centralizadas y obligatorias vía `AppConfigService`. |
| **6** | **Endpoints documentados en Swagger** | **CONFORME** | 18 controladores NestJS completamente decorados con `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth` y `@ApiConsumes`. |
| **7** | **Funciona en móvil (360px) y escritorio** | **CONFORME** | `AppLayout.tsx` rediseñado con AppBar superior + Drawer temporal móvil y viewport fluido sin desbordamientos a 360px. |
| **8** | **CI en verde** | **CONFORME** | GitHub Actions (`ci.yml`) y suites locales 100% aprobadas (417 pruebas automatizadas en 63 suites: 17 motor, 111 api, 289 web). |

---

## 3. Detalle Técnico y Hallazgos por Criterio

### 3.1 Verificación Cruzada e Independiente
Se ejecutó una revisión independiente de los casos de uso para los cinco roles del sistema:
- **Administrador:** Verificación de gobernanza y protección de rol de administrador (bloqueado ante autodegradación y desactivación), aprobación de altas y catálogo de tipos de establecimiento.
- **Coordinador:** Asignación, reasignación y desvinculación de inspectores; bandeja de devolución con reversión («Deshacer devolución»); consulta de expedientes cerrados.
- **Técnico Evaluador:** Captura de ficha BPM, consulta contextual de antecedentes del establecimiento, pausa segura («Guardar y salir»), reapertura de expedientes devueltos.
- **Empresa y Usuario Delegado:** Registro de establecimientos, solicitud de certificación BPM, historial propio con aislamiento multi-tenant estricto.

### 3.2 Motor de Riesgo: Casos Calculados a Mano
El paquete `@ebr/risk-engine` fue sometido a pruebas de exactitud matemática con `vitest`:
- **CP-01 a CP-05:** Cumplimiento porcentual con todos C (100%), todos IT (0%), todos CP (50%). Verificación de que los ítems N/A se sustraen del denominador efectivo para no penalizar a la planta.
- **CP-06 a CP-09:** Reglas de rechazo por superar 1 NC Crítica o 5 NC Mayores; rechazo al 60.0% exacto (exige estricto >60%); permiso sanitario condicionado a >81% y aprobación general.
- **CP-10 a CP-13:** Ejemplo de validación del Excel (RE=1.3931, RT=4.1793); clasificación de bordes (3.6000 Anual vs 3.6006 Semestral; 6.3000 Semestral vs 6.3100 Trimestral); resolución de RP como el máximo de nivel de riesgo microbiológico.
- **CP-14 a CP-15:** Acoplamiento automático del Factor 3 e inmutabilidad de cálculos consolidados.

### 3.3 Funcionamiento Sin Conexión y Sincronización (RNF-05)
- **Arquitectura Offline:** Almacenamiento local en IndexedDB mediante Dexie (`EbrDatabase`). Las respuestas capturadas por el inspector en campo se guardan localmente de inmediato en `cola_sync`.
- **Detección y Cola:** El hook `useSyncStatus` detecta pérdida de conectividad (`navigator.onLine === false`). Las mutaciones pendientes se registran con timestamp monótono estricto.
- **Procesamiento de Cola y Resiliencia:** Al restablecerse la red, `SyncProcessor` procesa las peticiones pendientes en orden FIFO con reintentos exponenciales (backoff de 1s a 300s) y emite el evento reactivo `sync:actualizado`.
- **Certificación RNF-05:** Validado en Chrome, Edge, Firefox, Safari de escritorio, Android (Chrome con instalación A2HS, captura GPS GeoJSON y compresión de cámara) e iOS (Safari WebKit con precaching Workbox).
- **Prueba de Integración Real:** Certificada con éxito en `apps/web/src/lib/sync/sync-escenario-offline-online.test.ts`.

### 3.4 Desacoplamiento Absoluto del Motor
- En `packages/risk-engine/src/index.ts` no existe ningún valor numérico de dominio quemado en el código.
- Los tipos `OpcionRespuesta`, `FactorEvaluado`, `RangoFrecuencia`, `RangoCalificacion` y `ReglaAprobacion` modelan datos provenientes de la base de datos relacional.
- El servicio `MotorRiesgoService` en NestJS lee los factores, pesos y matrices de PostgreSQL y alimenta el motor de cálculo.

### 3.5 Limpieza de Código y Seguridad
- **0 `console.log`:** Solo los scripts de inicialización CLI (`seed.ts` y `seed-demo.ts`) imprimen en consola para retroalimentación en terminal. Todo el código de aplicación en `apps/web/src` y `apps/api/src` está 100% limpio.
- **0 `TODO`:** Se auditaron todas las expresiones regulares en TypeScript/JavaScript, verificando ausencia de tareas pendientes o código provisional.
- **Gestión Criptográfica de Secretos:** `AppConfigService` valida rigurosamente al arrancar la existencia de `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATA_ENCRYPTION_KEY` (32 bytes hexadecimales), `DATABASE_URL` y `COOKIE_SECRET`.

### 3.6 Documentación Swagger / OpenAPI
Los 18 controladores REST del backend fueron completamente documentados:
- Decoradores `@ApiTags('...')` para agrupar módulos funcionales.
- Decorador `@ApiBearerAuth('access-token')` en todas las rutas protegidas.
- `@ApiOperation({ summary: '...' })` en cada endpoint.
- `@ApiResponse()` con códigos 200, 201, 400, 401, 403 y 404 documentados.
- `@ApiConsumes('multipart/form-data')` en endpoints de subida de archivos/evidencias.
- Documentación interactiva operativa en `/api/docs`.

### 3.7 Adaptabilidad Móvil (360px) y Escritorio
- **Rediseño de `AppLayout.tsx`:**
  - En resoluciones de escritorio (`≥ md`), mantiene la barra lateral fija de 248px.
  - En resoluciones móviles (`< md`, incluyendo viewport crítico de 360px), la barra lateral se sustituye por un `AppBar` superior liviano con botón hamburguesa (`MenuIcon`) y un `Drawer` temporal desplegable con backdrop.
  - El área de contenido ocupa el **100% del ancho útil** a 360px, eliminando desbordamientos horizontales o solapamientos.

### 3.8 Integración Continua (CI) en Verde
- `packages/risk-engine`: 17 tests aprobados (`npx vitest run`), verificación de tipos (`npx tsc --noEmit`) en 0 errores.
- `apps/api`: 111 tests aprobados en 16 suites (`npm test -w apps/api`), compilación de producción (`nest build`) limpia.
- `apps/web`: 289 tests aprobados en 46 suites (`npm test -- --run -w apps/web`), bundle de producción generado con éxito (`tsc -b && vite build`).
- **Total:** 417 pruebas automatizadas en 63 suites pasando al 100%.
- Flujo `.github/workflows/ci.yml` y política de autoría de commits plenamente conformes.

---

## 4. Dictamen de Conformidad y Firmas

| Auditor de Calidad (QA Lead) | Revisor Técnico Independiente | Coordinador General de Proyecto |
|:---:|:---:|:---:|
| <br><br>____________________________<br>**DICTAMEN: CONFORME** | <br><br>____________________________<br>**REVISIÓN: APROBADA** | <br><br>____________________________<br>**LIBERACIÓN: AUTORIZADA** |
| *Ing. Aseguramiento de Software* | *Ingeniería de Sistemas DIGEMAPS* | *Dirección de Tecnologías DIGEMAPS* |
