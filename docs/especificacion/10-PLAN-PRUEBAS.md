# 10 - Plan de Pruebas

## 1. Objetivo

Definir la estrategia de pruebas del sistema EBR/BPM, documentando lo que ya está probado (y cómo) y lo que falta por cubrir.

## 2. Lo que ya existe y está verificado

### 2.1 `packages/risk-engine` — 17 casos, `vitest`

**Estado: ✅ el módulo mejor probado de todo el proyecto.**

Cobertura confirmada leyendo `motor.test.ts`:
- Cálculo de % de cumplimiento con y sin respuestas "No Aplica".
- Todos los bordes de rango de clasificación de frecuencia (3.60 / 3.61 / 6.30 / 6.31).
- Regla de aprobación con no conformidades críticas y mayores en distintas combinaciones.
- RP calculado como máximo entre categorías (caso `CP-11`, entre otros).
- Persistencia histórica: cambiar el % de cumplimiento actual no altera evaluaciones ya calculadas (verifica la denormalización deliberada del modelo — ver `05-MODELO-DATOS.md` §5).
- Reproducción exacta del ejemplo del Excel original, con el defecto D-01 corregido (RE=1.3931, RT=4.1793, Semestral).

### 2.2 `db/opcional/06_pruebas.sql` — verificación cruzada en PL/pgSQL

**Estado: ✅ implementado, corre en CI.**

7 casos de cálculo del motor + 2 de integridad, ejecutados directamente contra el esquema PostgreSQL. El propósito es que estas pruebas y las de `risk-engine` cubran los mismos escenarios de forma independiente — **no verificado si el CI compara automáticamente los resultados numéricos entre ambas suites**, o si simplemente corre cada una por su lado sin cruzarlas. Esto debería confirmarse: si no hay comparación automática, la garantía real de "las dos implementaciones nunca divergen" depende de que alguien note manualmente una discrepancia.

### 2.3 CI (`.github/workflows/ci.yml`)

Valida en cada push/PR:
- `packages/risk-engine`: compilación TypeScript (`tsc`) + `vitest`.
- `db/*.sql`: carga completa del esquema + `db/opcional/06_pruebas.sql`.
- Política de autoría de commits (Conventional Commits).

**No hay job de CI para `apps/api`** — el backend en la rama sin fusionar no tiene ninguna suite de pruebas automatizada corriendo en pipeline.

## 3. Lo que falta por cubrir

### 3.1 Pruebas unitarias — backend NestJS

No verificado si existen pruebas unitarias en `apps/api`. Prioridad de cobertura sugerida, de mayor a menor riesgo:
- Guards de autorización (`RolesGuard`, `EmpresaOwnershipGuard`) — son la única capa de aislamiento de datos mientras RLS no esté activo (ver `07-SEGURIDAD.md`).
- Servicio de tokens (rotación de refresh token, revocación en cascada).
- `motor-riesgo.service.ts` — validar que la integración con `packages/risk-engine` (importado como ESM dinámico desde un backend CommonJS) no introduce errores de redondeo o de tipo en el borde.
- Reglas de estado de `caso` y `evaluacion` (transiciones válidas/inválidas).

### 3.2 Pruebas de integración

- API + PostgreSQL: creación de caso con cada uno de los 4 orígenes, verificando el CHECK de "exactamente uno".
- Flujo completo: crear evaluación → responder ficha → calcular riesgo → **verificar que se programa la siguiente inspección** (hoy fallaría, porque esa pieza no existe — esta prueba, al escribirse, documentaría el vacío de RF-07 de forma ejecutable).
- Bloqueo de datos: intentar modificar `respuesta_item` de una evaluación bloqueada y confirmar el rechazo, tanto vía trigger SQL como vía guard de aplicación si existe.
- Subida de evidencias: archivo con extensión falsificada (validar que la verificación por magic bytes realmente lo rechaza).

### 3.3 Pruebas de API

- Autenticación: login válido, credenciales incorrectas, cuenta bloqueada tras N intentos, token expirado, refresh rotativo.
- Autorización: acceso con rol incorrecto a cada endpoint protegido.
- Rate limiting: confirmar los límites de 8/min en login y 5/hora en registro.
- Validación de entrada: intento de mass-assignment (por ejemplo, enviar `estado: 'APROBADO'` en un registro de usuario) y confirmar que `ValidationPipe` lo bloquea.

### 3.4 Pruebas de frontend / móviles

`apps/web` ya tiene 25 pantallas construidas (dashboards por rol, wizard de inspección del técnico, portal público, calendario de coordinador). Pendiente de definir un plan de pruebas de frontend equivalente a §3.1-3.3.

**RNF-05 — Compatibilidad de navegadores/SO (asignado a QA/Rowlis):** ✅ **CERTIFICADO AL 100% POR QA (Rowlis Trinidad)**.
- **Chrome y Edge de escritorio (Chromium):** Registro exitoso del Service Worker (`sw.js`), manifest PWA válido (`display: standalone`, tema `#1565C0`, iconos 64px, 192px, 512px y maskable). Instalación nativa mediante A2HS / barra de direcciones de Edge. Precaching offline con Workbox operativo.
- **Firefox de escritorio (Gecko):** Service Worker y CacheStorage operativos; precaching de assets estáticos y almacenamiento en IndexedDB (`Dexie`) validado. Carga en modo desconectado conforme.
- **Safari de escritorio (WebKit macOS):** Service Worker y Cache Storage operativos; Web App Manifest compatible con "Agregar al Dock" en macOS Sonoma (Safari 17+).
- **Android (Chrome móvil):** Instalación PWA nativa ("Agregar a la pantalla de inicio" / WebAPK) comprobada. Captura GPS real mediante `navigator.geolocation.getCurrentPosition` con `enableHighAccuracy: true` generando archivos GeoJSON vinculados a criterios individuales (`respuestaItemId`). Captura de fotos y videos mediante `<input type="file" accept="...">` activando la cámara del dispositivo con compresión local en Canvas (`compressor.ts`) reduciendo archivos de ~8 MB a < 300 KB.
- **iOS (Safari móvil):** Compatible con Add to Home Screen mediante meta tags `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />`, `<meta name="viewport">` y tema. Bundle Workbox generado con compatibilidad ES5 (`workbox-window.prod.es5`) ejecutando sin fallas en WebKit.
- **Sincronización real en campo (Offline ➡️ Online):** Certificado mediante suite de integración automatizada `apps/web/src/lib/sync/sync-escenario-offline-online.test.ts`. El inspector acumula evaluaciones, respuestas, evidencias con GeoJSON GPS, finalizaciones e informes en `db.cola_sync` con timestamp monótono. Al recuperar la red, `SyncProcessor` drena la cola en estricto orden FIFO con autenticación Bearer, valida idempotencia por UUID, marca las operaciones como `'enviado'` y vacía los pendientes a 0, con backoff exponencial protector ante errores 500.

### 3.5 Pruebas de seguridad

- Confirmar que RLS efectivamente aísla datos entre empresas **una vez que `hardening.sql` se reescriba** — hoy no tiene sentido probarlo porque no hay políticas activas.
- Confirmar si `csurf()` está realmente invocado en el arranque (ver `07-SEGURIDAD.md` §11) — si no lo está, esta prueba debe fallar visiblemente hasta corregirse.
- Intentar iniciar sesión con un usuario con `dobleFactorActivo=TRUE` y confirmar el comportamiento (hoy: error, documentado como bug conocido).
- Verificar que ningún endpoint filtra stack traces o SQL en respuestas de error.

## 4. Pruebas por criterio de aceptación (ver `01-ALCANCE.md` §9)

| Criterio | Pruebas relacionadas | Estado |
|---|---|---|
| Motor de riesgo correcto | 17 casos TS + 7 casos SQL | ✅ Cubierto |
| Ciclo se cierra automáticamente | Prueba de integración propuesta en §3.2 | ❌ Fallaría hoy — la funcionalidad no existe |
| Cero números de dominio en código | Revisión de código / linter dedicado (no existe todavía) | 🟡 Verificado manualmente en `risk-engine`, sin gate automático |
| Bloqueo tras envío | Prueba de integración propuesta en §3.2 | 🟡 Cubierto en SQL, no confirmado en Prisma |
| Funcionamiento offline | PWA Workbox + Dexie IndexedDB + `sync-escenario-offline-online.test.ts` (2 tests) + `EjecutarEvaluacion.test.tsx` (16 tests) | ✅ Cubierto y certificado (RNF-05) |
| Seguridad | Ver §3.5 | 🟡 Parcial, con vacíos conocidos (RLS, MFA) |

## 5. Datos de prueba necesarios

- Usuarios de cada rol, incluyendo uno con `dobleFactorActivo=TRUE` para probar el bug conocido.
- Al menos una empresa con múltiples establecimientos, cada uno con distintas categorías de alimento (para ejercitar RP como máximo entre categorías).
- Casos originados por cada uno de los 4 orígenes.
- Evaluaciones en distintos estados, incluyendo al menos una con no conformidades críticas (para la regla de no aprobación) y una en el borde exacto de cada rango de frecuencia (RT = 3.60, 3.61, 6.30, 6.31).
- Al menos un archivo de evidencia con extensión falsificada, para probar la validación por magic bytes.

## 6. Criterios de salida antes de producción

- Cero defectos críticos abiertos, en particular el cierre de ciclo (RF-07).
- A-01, A-02 y A-07 resueltos o formalmente aceptados por el equipo/DIGEMAPS.
- RLS reescrito y probado, o decisión explícita del equipo de posponerlo con justificación documentada.
- MFA corregido o deshabilitado explícitamente hasta que se corrija (no dejado en un estado que rompe el login silenciosamente).
- Documentación de seguridad de la rama corregida para no afirmar RLS como implementado.

## 7. Pendientes de definir con el equipo/DIGEMAPS

- Porcentaje mínimo de cobertura esperado.
- Volumen de datos esperado para pruebas de carga (usuarios concurrentes, evaluaciones por período).
- Si se requiere un ambiente de staging separado del de desarrollo antes de la entrega del 25 de septiembre.
