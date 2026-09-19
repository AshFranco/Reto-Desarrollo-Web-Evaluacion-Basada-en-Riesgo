# Contexto del proyecto EBR/BPM — estado real verificado

**Generado:** 2026-09-03, leyendo el código y el historial de git directamente (no el README, no supuestos).
**Propósito:** que otra sesión de Claude entienda qué existe de verdad antes de seguir desarrollando.

## 0. Lo primero que hay que saber (no está en el README)

1. **`main` casi no tiene código.** Solo tiene: SQL puro en `db/`, el paquete `packages/risk-engine` (motor de riesgo en TypeScript), y documentación. **No hay `apps/api` ni `apps/web` en `main`.**
2. **Existe un backend completo (NestJS + Prisma) pero vive en una rama sin fusionar**: `feat/EBR-backend-api` (remota: `origin/feat/EBR-backend-api`), un solo commit `7dd471a` de hoy (2026-09-03), autora **Gabrielabdp** (`gabyduverge03@gmail.com`), no fusionado a `main` ni a `develop`. 117 archivos, ~21.335 líneas. Es un fast-forward directo desde `main` (un commit por delante de `d62fd73`), así que fusionarlo sería trivial en términos de git, pero el contenido no ha sido revisado por el equipo.
3. **No hay Prisma en `main`.** El `schema.prisma` solo existe en esa rama. Todo lo que sigue sobre "Prisma schema" se refiere a esa rama, no a `main`.
4. **No existe ningún frontend en ninguna rama.** Cero líneas de React/Vite/PWA en todo el repositorio.
5. **Hay dos fuentes de verdad de base de datos que han divergido entre sí**: `db/*.sql` (SQL puro, 51 tablas, mantenido en `main`) y `apps/api/prisma/schema.prisma` (rama `feat/EBR-backend-api`, "convertido desde el DBML oficial" pero con diferencias reales — ver §2.4).

Todo el resto del documento distingue explícitamente qué está en `main` y qué está solo en la rama sin fusionar.

---

## 1. Stack y estructura general

### 1.1 Stack confirmado

| Capa | En `main` | En `feat/EBR-backend-api` (sin fusionar) |
|---|---|---|
| Motor de riesgo | TypeScript, `decimal.js` ^10.4.3, `vitest` ^2.1.8 (`packages/risk-engine`) | Mismo paquete, importado vía `"@ebr/risk-engine": "file:../../packages/risk-engine"` |
| Backend | — (no existe) | NestJS 10.4, Prisma 5.19, PostgreSQL, `argon2` 0.40, `passport-jwt`, `helmet`, `class-validator`, `ioredis`, `otplib`, `nestjs-pino` |
| Base de datos | PostgreSQL 16 (`db/*.sql`, esquema `ebr`) | PostgreSQL vía Prisma (esquema por defecto `public`, migración propia) |
| Frontend | — (no existe) | — (no existe tampoco en esta rama) |
| Contenedores | `docker-compose.yml` raíz: postgres 16-alpine + MinIO + Mailhog | `apps/api/docker-compose.yml` propio (no leído a fondo — existe pero no verificado su contenido) |
| CI | `.github/workflows/ci.yml`: valida `packages/risk-engine` (tsc + vitest) y `db/*.sql` (carga esquema + `db/opcional/06_pruebas.sql`) + política de autoría de commits | No hay job de CI para `apps/api` todavía (el `ci.yml` de `main` no lo cubre, y esa rama no trae workflow propio) |

**Versión de Node exigida por CI:** 22 (`actions/setup-node@v4`, `node-version: '22'`).

`docs/adr/001-stack.md` (ADR-001) dice **"Estado: PROPUESTO — pendiente de ratificación"**, con NestJS + Prisma + PostgreSQL + React 18 + MUI como propuesta. **Ojo:** `docs/plan-maestro.md` tiene su propio "ADR-01" interno que recomienda **.NET 9 + EF Core** en su lugar (documento más antiguo, de planeación, no ratificado). Es decir, hay dos recomendaciones de stack distintas en la documentación (.NET en el plan maestro vs. NestJS/Prisma en el ADR formal), y la única implementación real que existe (la rama de Gabriela) siguió la segunda. Esto no está resuelto formalmente — el ADR-001 sigue en estado "propuesto".

### 1.2 Estructura real (no la del README)

```
main:
├── db/                          SQL puro, PostgreSQL 16, esquema `ebr` — FUENTE "OFICIAL" según docs
│   ├── 01_schema.sql            51 tablas, triggers, índices (DDL completo y consistente)
│   ├── 02_seed_catalogos.sql    roles, permisos, 6 factores de riesgo + 24 opciones, matriz de frecuencia
│   ├── 03_seed_ficha_bpm.sql    90 nodos, 45 criterios evaluables (generado del Excel)
│   ├── 04_seed_matriz_alimentos.sql   17 categorías, 111 subcategorías (generado del Excel)
│   ├── 05_funciones.sql         motor de riesgo en PL/pgSQL (verificación independiente del TS)
│   └── opcional/
│       ├── 06_pruebas.sql       7 casos de prueba del motor + 2 de integridad (usado por CI)
│       └── 07_ajustes_modelo_equipo.sql   documento HISTÓRICO: ADR de cómo se llegó de 25→51 tablas. Ya está integrado en 01_schema.sql, no se ejecuta en el flujo normal.
├── packages/
│   └── risk-engine/             ÚNICA implementación TS del motor. src/index.ts + tests/motor.test.ts (17 casos)
├── docs/                        plan-maestro.md, modelo-datos.md, hallazgos.md, der-nucleo.mermaid, adr/001-stack.md, contratos/ (4 contratos entre roles)
├── .githooks/, .github/         hooks de commit-msg/pre-commit, CI, plantillas de issue/PR
└── docker-compose.yml           postgres + minio + mailhog

feat/EBR-backend-api (sin fusionar, un commit por delante de main):
└── apps/api/                    Backend NestJS completo — ver §3
    ├── prisma/schema.prisma     43 modelos (no 51 — ver §2.4)
    ├── prisma/sql/hardening.sql RLS "PENDIENTE DE REESCRITURA" — ver §6
    ├── prisma/seed.ts + seed-data/*.json   seed INDEPENDIENTE, no reutiliza db/02-04
    ├── src/modules/*            16 módulos NestJS — ver §3
    └── COMPARACION_ARQUITECTURA.md, COMPARATIVO_ARQUITECTURA.md, INFORME_TECNICO.md, SETUP_WINDOWS.md   documentación propia de la autora
```

Directorios mencionados en el README que **no existen en ningún lado**: `packages/shared-types`, `apps/web`.

---

## 2. Base de datos

Hay que tratar esto en dos partes porque **no son el mismo esquema**.

### 2.1 `db/01_schema.sql` (main) — 51 tablas, esquema `ebr`

Organizado en 8 módulos. Lista completa de tablas con campos clave:

**Módulo 1 — Seguridad:** `rol` (codigo, nombre, es_interno) · `permiso` (codigo, modulo) · `rol_permiso` (rol_id, permiso_id) · `usuario` (uuid_local, documento_identidad, correo UNIQUE, hash_password, empresa_id, estado CHECK PENDIENTE_VALIDACION/APROBADO/RECHAZADO/INACTIVO, carta_autorizacion_id → documento, doble_factor_activo, secreto_2fa, intentos_fallidos, bloqueado_hasta) · `usuario_rol` · `refresh_token` (token_hash, expira_en, revocado).

**Módulo 2 — Geografía:** `provincia` · `municipio` (→provincia) · `dps_das` (tipo CHECK DPS/DAS, →provincia).

**Módulo 3 — Empresa:** `actividad_economica` · `empresa` (rnc UNIQUE, →municipio, →actividad_economica) · `establecimiento` (→empresa, →municipio, →dps_das, numero_permiso_sanitario, produccion_anual, empleados_masculino/femenino, latitud/longitud) · `tipo_contacto` · `contacto` (CHECK: pertenece a empresa XOR establecimiento, nunca ambos ni ninguno).

**Módulo 4 — Catálogo de riesgo:** `nivel_riesgo` (codigo BAJO/MEDIO/ALTO, puntaje_matriz 2/4/8, puntaje_rp 1/2/3 — reconcilia las dos escalas del dominio) · `categoria_alimento` · `subcategoria_alimento` (→categoria, →nivel_riesgo microbiológico/químico/resultante, requiere_revision) · `establecimiento_categoria` (M:N) · `version_matriz_riesgo` (estado BORRADOR/PUBLICADA/ARCHIVADA, único índice parcial para solo una PUBLICADA a la vez) · `factor_riesgo_establecimiento` (numero, peso CHECK 0<peso≤1, es_automatico) · `opcion_factor` (puntaje CHECK 1-3, limite_inf/limite_sup solo para factores automáticos) · `rango_frecuencia` (limite_inferior/superior, incluye_inferior/superior, meses_hasta_proxima) · `rango_nivel_riesgo` (es_supuesto — ver A-01 abajo).

**Módulo 5 — Ficha BPM:** `version_ficha` (porcentaje_minimo_aprobacion=60, max_nc_criticas=1, max_nc_mayores=5, porcentaje_permiso_sanitario=81 — **todos datos, no constantes**) · `nivel_criticidad` (C/M/Me) · `item_ficha` (auto-referenciada vía id_padre, CTE recursiva, CHECK anti-autopadre, peso, criticidad_id nullable) · `literal_item` (sub-literales a/b/c, texto guía) · `opcion_respuesta` (codigo C/CP/IT/N-A, valor, excluye_del_calculo) · `rango_calificacion`.

**Módulo 6 — Origen de casos:** `origen_caso` · `solicitud_bpm` (estado BORRADOR/PENDIENTE_ASIGNACION/ASIGNADA/RECHAZADA/CERRADA) · `alerta_lapch` (resultado PROCEDE/NO_PROCEDE) · `denuncia` (resultado PROCEDE/NO_PROCEDE/REMISION, es_anonima) · `programacion_institucional` (cierra el ciclo) · `caso` (CHECK: exactamente uno de los 4 orígenes debe estar presente).

**Módulo 7 — Evaluación y cálculo:** `estado_evaluacion` (11 estados, es_final, bloquea_datos) · `evaluacion` (uuid_local, version_registro para concurrencia optimista, bloqueada) · `asignacion_evaluador` · `historial_estado` · `respuesta_item` (valor_aplicado congelado, UNIQUE evaluacion+item) · `evidencia` (tipo FOTO/DOCUMENTO/VIDEO, hash_sha256) · `medida_correctiva` (hasta N, sin límite artificial) · `evaluacion_participante` · `evaluacion_factor_riesgo` (snapshot por evaluación, no por establecimiento) · `calculo_riesgo` (snapshot inmutable completo: cumplimiento, NC, RP, RE con re_detalle JSONB, RT, frecuencia, fecha_proxima_inspeccion).

**Módulo 8 — Soporte:** `documento` · `notificacion` · `auditoria` (accion CHECK INSERT/UPDATE/DELETE/LOGIN/LOGOUT/DOWNLOAD/SYNC/IMPORT) · `operacion_pendiente` (cola de sync offline, uuid_local idempotente) · `importacion_excel` · `importacion_detalle`.

**Enums (como CHECK, no tipos nativos):** tipo_documento, estado usuario, tipo dps_das, estado version (BORRADOR/PUBLICADA/ARCHIVADA), estado solicitud_bpm, resultado alerta/denuncia, prioridad (BAJA/NORMAL/ALTA/URGENTE), tipo evidencia, accion auditoria, tipo/estado operacion_pendiente, tipo_fuente/resultado importación.

**Triggers de integridad (3):**
1. `trg_validar_pesos` — la suma de pesos de los 6 factores por versión no puede exceder 1.00.
2. `trg_validar_ciclo` — impide ciclos en `item_ficha.id_padre` (máx. 20 saltos).
3. `trg_eval_bloqueada` — una evaluación con `bloqueada=TRUE` rechaza INSERT/UPDATE/DELETE en `respuesta_item`.

Más 2 índices únicos parciales que garantizan solo una versión `PUBLICADA` a la vez (`version_ficha`, `version_matriz_riesgo`).

**No hay archivo `hardening.sql` en `main`.** El usuario lo mencionó en su pedido asumiendo que existe — solo existe en la rama sin fusionar, y en un estado no funcional (ver §2.5 y §6).

**No hay políticas RLS en `main`.** Cero `CREATE POLICY` en todo `db/*.sql`.

### 2.2 Relaciones (FKs) — resumen de las más importantes

`usuario.empresa_id→empresa` · `empresa.municipio_id→municipio` · `establecimiento.empresa_id→empresa` (NOT NULL) · `subcategoria_alimento.categoria_id→categoria_alimento` · `item_ficha.id_padre→item_ficha` (auto-ref) · `respuesta_item.evaluacion_id→evaluacion`, `.item_ficha_id→item_ficha`, `.opcion_respuesta_id→opcion_respuesta` · `evaluacion.caso_id→caso`, `.version_ficha_id→version_ficha`, `.version_matriz_id→version_matriz_riesgo` · `calculo_riesgo.evaluacion_id→evaluacion` (UNIQUE 1:1) · `caso` tiene 4 FKs opcionales (solicitud/programación/alerta/denuncia) con el CHECK de "exactamente una".

### 2.3 Ambigüedades y hallazgos documentados (relevantes para cualquier trabajo futuro)

| ID | Qué dice | Estado |
|---|---|---|
| **A-01** | Conversión de escala 2-8 (matriz alimentos) → Bajo/Medio/Alto (1-3, frecuencia). No está en ningún Excel fuente. | **Bloqueante.** Cargado como supuesto en `rango_nivel_riesgo` con `es_supuesto=TRUE` (2.0-2.9→BAJO, 3.0-5.9→MEDIO, 6.0-8.0→ALTO) |
| **A-02** | ¿Quién asigna criticidad C/M/Me a los 45 criterios? | **Bloqueante.** `item_ficha.criticidad_id` nullable, sin resolver |
| **A-07** | ¿El permiso sanitario (>81%) depende de aprobar la inspección? | Se asumió que sí, documentado en `evaluarAprobacion()` del motor TS |
| **D-01** | Factor 6 del Excel original devuelve `FALSE` por comparación de texto rota. RE del ejemplo (1.2067) está mal calculado; el correcto es 1.3931 | Resuelto por diseño (FK en vez de texto libre) |
| **D-02 a D-06** | Filas `#N/A`, subcategorías sin nivel de riesgo, columna de criticidad vacía, jerarquía solo en texto, categoría sin subcategorías | Ver `docs/hallazgos.md` — todos con manejo explícito en el esquema |

**Precisión numérica:** el esquema usa `numeric(8,4)` en `aporte`/`re_valor`/`rt_valor` (no `numeric(6,2)`) porque con 2 decimales, 31 de 12.288 combinaciones posibles clasifican mal la frecuencia de inspección (ver `docs/hallazgos.md`). El motor TS usa `decimal.js` con precisión 20 y redondea una sola vez al final, no en cada paso.

### 2.4 `apps/api/prisma/schema.prisma` (rama sin fusionar) — diverge de `db/01_schema.sql`

Este schema se declara "convertido fielmente desde el DBML oficial (51 tablas)", pero **no lo es exactamente**. Comparando modelo por modelo contra `db/01_schema.sql`:

**Tablas de `db/01_schema.sql` que faltan en `schema.prisma`:** `actividad_economica`, `literal_item`, `evaluacion_participante`, `documento`, `importacion_excel`, `importacion_detalle` (6 tablas).

**Modelos en `schema.prisma` que NO están en `db/01_schema.sql`:**
- `RefreshToken` — el propio schema lo marca explícitamente: *"EXTENSIÓN AL DBML ORIGINAL: el esquema oficial no incluye una tabla para refresh tokens... Señalar al equipo para incorporarla formalmente"*.
- `InformeEvaluacion` y `Expediente` — tablas nuevas, no documentadas en `db/01_schema.sql` ni en `docs/modelo-datos.md`.

**Otras diferencias:** `usuario.rol` en Prisma es puramente M:N vía `usuario_rol/rol` (igual que SQL), pero el código de auth (`auth.service.ts`) **colapsa esto a un solo "rol principal"** por prioridad fija en código (ver §6) — la granularidad M:N del modelo no se usa realmente. Los estados de `estado_evaluacion` sembrados por `seed.ts` (`PROGRAMADA, EN_CURSO, FINALIZADA, EN_REVISION, APROBADA, DEVUELTA, CERRADA` — 7 estados) **no coinciden** con los 11 estados sembrados por `db/02_seed_catalogos.sql` (`PENDIENTE_ASIGNACION, ASIGNADA, PROGRAMADA, EN_EJECUCION, FINALIZADA_CAMPO, ENVIADA, EN_REVISION, DEVUELTA, APROBADA, CERRADA, CANCELADA`).

También existe una migración Prisma ya generada (`apps/api/prisma/migrations/*/migration.sql`, 968 líneas) que es **una tercera fuente de DDL**, independiente de `db/01_schema.sql`, generada automáticamente desde `schema.prisma`. Es decir: hay dos flujos de base de datos completos y no sincronizados conviviendo en el repositorio.

### 2.5 `apps/api/prisma/sql/hardening.sql` (rama sin fusionar) — RLS

**No contiene ninguna política RLS activa.** El archivo completo es un comentario que dice textualmente: *"PENDIENTE DE REESCRITURA... Este archivo contenía las políticas de Row-Level Security para el esquema SIMPLIFICADO anterior (25 tablas). Con la adopción del esquema oficial de 51 tablas, las políticas de abajo YA NO SON VÁLIDAS"*. Enumera 5 puntos pendientes de reescribir (visibilidad de empresa, solicitud_bpm, caso/evaluación vía JOIN, evaluación del propio técnico, trigger de bloqueo) pero no tiene ni un solo `CREATE POLICY` funcional.

**Esto contradice lo que dice `apps/api/README.md`**, que en su tabla de "Checklist de seguridad implementado" afirma *"Row-Level Security | `prisma/sql/hardening.sql` — políticas por tabla sensible"* como si estuviera hecho. No lo está — ver §6 para más detalle de esta discrepancia.

---

## 3. Módulos backend (todos en la rama `feat/EBR-backend-api`, ninguno en `main`)

16 módulos NestJS bajo `apps/api/src/modules/`. Todos los endpoints están versionados bajo `/api/v1/` (`app.setGlobalPrefix('api')` + `VersioningType.URI`). Guard global `JwtAuthGuard` (fail-closed, requiere `@Public()` explícito para exceptuar) + `RolesGuard` global + `ThrottlerGuard` global (100 req/min por IP).

| Módulo | Endpoints | Roles | Estado |
|---|---|---|---|
| **auth** | `POST registro` (público, 5/hora) · `POST login` (público, 8/min, requiere captcha) · `POST refresh` (público, cookie firmada) · `POST logout` | público / autenticado | 🟡 Parcial — login/registro/refresh/logout funcionan; **recuperación de contraseña NO existe** (no hay endpoint forgot/reset); MFA declarado pero roto (ver §6) |
| **usuarios** | `GET registros/pendientes` · `PATCH registros/:id/resolver` · `GET perfil` | ADMINISTRADOR / cualquiera autenticado | 🟡 Parcial — falta el flujo de "carta de autorización" (el campo `carta_autorizacion_id` de `db/01_schema.sql` no aparece en este módulo ni en el schema Prisma) |
| **empresas** | `POST` · `GET` (lista filtrada por empresa del usuario) · `GET :id` · `PATCH :id` | ADMINISTRADOR/COORDINADOR crean; ADMIN_EMPRESA edita | 🟡 Parcial — CRUD de empresa existe; **no hay módulo/controlador de `establecimientos`** (no se encontró `establecimientos.controller.ts` en ningún lugar del diff — es un vacío real, no solo no verificado) |
| **solicitudes-bpm** | `POST` (crear borrador) · `POST :id/enviar` (con `EmpresaOwnershipGuard`) · `GET mias` | ADMIN_EMPRESA / USUARIO_DELEGADO | ✅ Completo a nivel de API |
| **casos** | `GET` (filtrado por empresa si no es rol interno) · `GET :id` (con ownership guard) | cualquiera autenticado, filtrado | 🟡 Parcial — **solo lectura**. No crea casos (la creación vive en alertas-lapch/denuncias/solicitudes-bpm, ver abajo) |
| **alertas-lapch** | `POST` (registrar, crea `Caso` en transacción) · `PATCH :id/resolver` · `GET` | ADMINISTRADOR/COORDINADOR | ✅ Completo |
| **denuncias** | `POST` (crea `Caso`) · `PATCH :id/resolver` · `GET` | ADMINISTRADOR/COORDINADOR | ✅ Completo |
| **asignaciones** | `POST` (asignar evaluador) · `GET mias` | COORDINADOR/ADMINISTRADOR asignan; TECNICO_EVALUADOR consulta | ✅ Básico funcional |
| **calendario** | `GET` (rango de fechas) | TECNICO_EVALUADOR | 🟡 Básico — solo query, sin lógica de vistas |
| **formularios** | `GET vigente` (ficha jerárquica) | autenticado | 🟡 Solo lectura de catálogo |
| **evaluaciones** | `POST :id/iniciar` · `POST :id/respuestas` · `POST :id/finalizar` | TECNICO_EVALUADOR | 🟡 Parcial — no se verificó a fondo `evaluaciones.service.ts` más allá de la firma |
| **motor-riesgo** | `POST calcular` | ADMINISTRADOR/COORDINADOR/TECNICO_EVALUADOR | ✅ **El módulo más maduro y verificado** — ver §4. **Pero no cierra el ciclo**: no crea `ProgramacionInstitucional` ni el siguiente `Caso` tras calcular (ver hallazgo abajo) |
| **categorias-alimento** | `GET` (catálogo) · `POST asignar` · `GET establecimiento/:id` | autenticado / varios roles | ✅ Completo |
| **evidencias** | `POST` (multipart, `FileValidationPipe` con magic bytes, límite 15MB) | TECNICO_EVALUADOR | 🟡 Solo subida; sin verificar compresión/almacenamiento real (`storage.service.ts` existe pero no se auditó su implementación) |
| **expedientes** | `PATCH :casoId/cerrar` · `GET` (búsqueda) | COORDINADOR/ADMINISTRADOR | 🟡 Básico |
| **informes** | `POST generar` · `PATCH :evaluacionId/revisar` | TECNICO_EVALUADOR genera; COORDINADOR/ADMINISTRADOR revisa | 🟡 Parcial — **no hay generación de PDF**: no existe ninguna dependencia de PDF (pdfkit, puppeteer, etc.) en `package.json`; el "informe" son campos de texto (`resumenEjecutivo`, `hallazgos`, `noConformidades`, `recomendaciones`) |

**Hallazgo importante — el ciclo no cierra en el backend:** `docs/plan-maestro.md` insiste en que "el resultado de una inspección determina cuándo será la siguiente... es un ciclo cerrado, no un flujo lineal", y `db/05_funciones.sql` (`fn_procesar_evaluacion`) sí implementa esto en SQL puro: al final del cálculo, inserta una fila en `programacion_institucional` para la siguiente inspección. **`motor-riesgo.service.ts` (NestJS) NO hace esto** — persiste `calculo_riesgo` y `evaluacion_factor_riesgo`, pero nunca crea `ProgramacionInstitucional` ni el `Caso` siguiente. Es decir: el propio "hallazgo que define la arquitectura" del proyecto está resuelto en la función PL/pgSQL pero no está portado al backend TypeScript.

**No se encontró ningún módulo de auditoría ni de sincronización offline** en la lista de 16 módulos — el modelo `Auditoria` existe en el schema pero no se encontró ninguna referencia a él en `apps/api/src` (`git grep` sobre el código de servicios no encontró ni un solo uso); el modelo `OperacionPendiente` (cola de sync offline) tampoco tiene módulo/servicio que lo consuma.

---

## 4. Lógica de negocio implementada

### 4.1 Motor de cálculo de riesgo — la parte más sólida del proyecto

Implementado **dos veces de forma independiente**, tal como manda `CONTRIBUTING.md`: en `packages/risk-engine/src/index.ts` (TypeScript, usado por el backend vía `import()` dinámico porque el paquete es ESM puro y el backend es CommonJS) y en `db/05_funciones.sql` (PL/pgSQL). El CI (`ci.yml`) corre ambas por separado pero **no verificado que las compare entre sí automáticamente** — solo corre cada suite de pruebas por su lado.

**Fórmulas exactas** (todas parametrizadas, ningún número hardcodeado en el motor — regla no negociable del proyecto):

```
% cumplimiento = puntos_obtenidos / (total_posible − puntos_excluidos_NA)
```
- Escala: C=1.0 · CP=0.5 · IT=0.0 · N/A=excluido del denominador (no vale cero)
- 45 criterios evaluables, todos con peso 1.0 hoy (el campo `peso` existe para poder cambiarlo sin tocar código)

```
RE = Σ (puntaje_factor × peso_factor)   sobre 6 factores, pesos suman exactamente 1.0000
```
| # | Factor | Peso | Puntajes de opciones |
|---|---|---|---|
| 1 | Volumen de producción | 0.16 | 3.00 / 2.33 / 1.67 / 1.00 |
| 2 | Implementación HACCP | 0.09 | 3.00 / 2.33 / 1.67 / 1.00 |
| 3 | **Cumplimiento BPM** (automático — se deriva del % de cumplimiento de la misma evaluación, no se digita) | **0.56** | ≤60%→3.00 · >60-70%→2.33 · >70-80%→1.67 · >80%→1.00 |
| 4 | Proveedor INABIE | 0.05 | 3.00 / 2.33 / 1.67 / 1.00 |
| 5 | Rechazos Registro Sanitario | 0.06 | 3.00 / 2.33 / 1.67 / 1.00 |
| 6 | Plan de muestreo microbiológico | 0.08 | 3.00 / 2.33 / 1.67 / 1.00 |

```
RP = MAX(nivel_riesgo)  sobre las categorías de alimento que elabora el establecimiento (Bajo=1, Medio=2, Alto=3)
RT = RP × RE
```
| RT | Nivel | Frecuencia | Meses |
|---|---|---|---|
| 1.0 – 3.6 (incluye 3.6) | Bajo | Anual | 12 |
| >3.6 – 6.3 (incluye 6.3) | Medio | Semestral | 6 |
| >6.3 – 9.0 | Alto | Trimestral | 3 |

**Regla de aprobación:**
```
SI NC_Críticas > 1                    → No aprueba, corregir NC Críticas inmediatamente
SI % > 60 Y NC_Mayores ≤ 5            → Aprueba
EN OTRO CASO                          → No aprueba, plan de corrección
```
Permiso sanitario: `% cumplimiento > 81` — **supuesto A-07**: además se asume que solo se otorga si la inspección también aprueba (no confirmado por la fuente).

**Precisión:** `decimal.js` con precisión 20, redondeo único al final (`ROUND_HALF_UP`). Está documentado y probado (`CP-11` en `motor.test.ts`) que redondear en cada paso intermedio produce clasificaciones de frecuencia incorrectas.

**17 casos de prueba** en `packages/risk-engine/tests/motor.test.ts`, todos verificados leyendo el archivo — cubren: cumplimiento con/sin N/A, todos los bordes de rango (3.6/3.61/6.3/6.31), la regla de aprobación con NC críticas/mayores, RP con MAX, persistencia histórica (cambiar CP no altera evaluaciones ya calculadas), y la reproducción exacta del ejemplo del Excel original con el defecto D-01 corregido (RE=1.3931, RT=4.1793, Semestral).

### 4.2 Reglas de negocio adicionales codificadas

- **Bloqueo tras envío (RF-17):** trigger `trg_eval_bloqueada` en `db/01_schema.sql` — rechaza cualquier cambio en `respuesta_item` si `evaluacion.bloqueada=TRUE`. **No verificado si este trigger se aplicó también en la migración Prisma** (la migración es generada desde `schema.prisma`, que no declara triggers — Prisma no gestiona triggers SQL nativamente; habría que revisar si `migration.sql` lo incluye a mano).
- **Solo una versión publicada a la vez:** índices únicos parciales en `version_ficha` y `version_matriz_riesgo` — solo en `db/01_schema.sql`, no verificado en Prisma.
- **Suma de pesos = 1.00:** trigger `trg_validar_pesos` en SQL puro; **duplicado casi textual** en `db/opcional/07_ajustes_modelo_equipo.sql` (documento histórico, no se ejecuta en el flujo normal) y también validado en tiempo de ejecución dentro de `calcularRe()` del motor TS (`if (sumaPesos.minus(1).abs().greaterThan(0.0001)) throw`).
- **Idempotencia offline:** todo objeto mutable lleva `uuid_local` generado en cliente (`evaluacion`, `respuesta_item`, `evidencia`, `operacion_pendiente`) — esto es infraestructura de datos preparada, pero **no hay ninguna lógica de sincronización que la use** (no existe cliente offline en absoluto).
- **Exactamente un origen por caso:** CHECK constraint en `caso` (SQL) — en Prisma solo hay un comentario `///` que dice "se valida en la aplicación y/o CHECK adicional", sin CHECK real declarado en el schema ni verificado en el código de los servicios que crean casos.

---

## 5. Seed data

Hay **dos fuentes de seed independientes y no sincronizadas**:

### 5.1 `db/02, 03, 04_*.sql` (main) — la "oficial" según toda la documentación
- `02_seed_catalogos.sql`: 5 roles, 20 permisos, 6 factores de riesgo con 24 opciones (verificado con un bloque `DO $$` que aborta si no son exactamente 24), matriz de frecuencia (3 rangos), rangos de nivel de riesgo (supuesto A-01).
- `03_seed_ficha_bpm.sql`: 90 nodos totales, 45 criterios evaluables, profundidad máxima 5. Generado leyendo `Ficha_Inspección_BPM_Revisión_Final_23-09-24.xlsx` con `openpyxl` (según `db/00_README.md`), no transcrito a mano.
- `04_seed_matriz_alimentos.sql`: 17 categorías, 111 subcategorías, generado desde `Matriz_Riesgo_Alimentos.xlsx`.

Cada archivo termina con verificación `DO $$ ... RAISE EXCEPTION` si el conteo no cuadra con lo esperado.

### 5.2 `apps/api/prisma/seed-data/*.json` (rama sin fusionar) — extracción INDEPENDIENTE
Cuatro archivos JSON (`categorias-alimento.json`, `ficha-bpm.json`, `factores-riesgo.json`, `rangos-riesgo.json`) que la propia autora describe como "datos extraídos de los 3 Excel oficiales" **por su cuenta**, no reutilizando los `.sql` de `main`. Estructura confirmada por lectura directa (ej. `categorias-alimento.json` tiene objetos `{categoria, subcategoria, riesgoMicrobiologico, puntajeMicrobiologico, riesgoQuimico, puntajeQuimico, puntajeRiesgoTotal, nivelRiesgoProducto}`).

**Discrepancia de conteo sin resolver:** `apps/api/README.md` dice *"catálogo CODEX de ~105 categorías"* mientras que `db/04_seed_matriz_alimentos.sql` (y toda la documentación de `main`) dice 17 categorías y 111 subcategorías. No queda claro si "~105" se refiere a subcategorías (cercano a 111) o es un conteo distinto — no verificado, hay que reconciliar antes de usar cualquiera de las dos fuentes como definitiva.

`COMPARACION_ARQUITECTURA.md` (de la propia autora) sugiere explícitamente que estos JSON se reutilicen para poblar los `.sql` de `main` en vez de volver a parsear los Excel — **eso no se ha hecho todavía**.

---

## 6. Autenticación y seguridad — qué está implementado de verdad

Todo lo de esta sección existe **solo en la rama `feat/EBR-backend-api`**. En `main` no hay ni una línea de código de autenticación.

| Mecanismo | Estado | Evidencia |
|---|---|---|
| **Argon2id** | ✅ Implementado | `password.service.ts`: `argon2.argon2id`, memoryCost 19456, timeCost 2 |
| **JWT access + refresh rotation** | ✅ Implementado | `token.service.ts`: access token firmado con secret propio; refresh token de 48 bytes random, hasheado con SHA-256 antes de guardar, rotado en cada uso, revocación en cascada |
| **Refresh token en cookie** | ✅ Implementado | `httpOnly, secure, sameSite=strict, signed`, scope limitado a `/api/v1/auth` |
| **RBAC** | 🟡 Parcial | `@Roles()` + `RolesGuard` funcionan, pero el modelo de permisos granulares M:N (`rol_permiso`) del schema **no se usa** — el código colapsa a un solo "rol principal" por usuario mediante una lista de prioridad hardcodeada en `auth.service.ts` (`PRIORIDAD_ROLES`), documentado ahí mismo como limitación conocida |
| **RLS (Row-Level Security)** | ❌ **No funcional pese a estar "cableado"** | `RlsContextMiddleware` SÍ fija `app.current_user_id`/`app.current_user_role` como variables de sesión de Postgres en cada request — pero `hardening.sql` (el único lugar donde irían los `CREATE POLICY`) está vacío de políticas reales, marcado explícitamente "PENDIENTE DE REESCRITURA" para el esquema de 51 tablas. El middleware prepara el contexto pero no hay ninguna política que lo use. **`apps/api/README.md` afirma lo contrario** ("Row-Level Security | políticas por tabla sensible" en su checklist) — es una discrepancia real entre la documentación de la autora y el código que dejó |
| **MFA / 2FA** | ❌ Declarado pero roto | `usuario.dobleFactorActivo` existe; si está en `TRUE`, `auth.service.ts` lanza un `Error` explícito porque *"el esquema oficial no define una columna para el secreto TOTP"* — es decir, ningún usuario con 2FA activo puede iniciar sesión hoy |
| **Recuperación de contraseña** | ❌ No implementado | No existe endpoint `forgot-password`/`reset-password` en `auth.controller.ts` |
| **Rate limiting / anti fuerza bruta** | ✅ Implementado (dos capas) | `ThrottlerGuard` global (100/min por IP) + `@Throttle` específico en login (8/min) y registro (5/hora) + `LoginThrottleService` (bloqueo de cuenta tras N intentos fallidos, configurable) |
| **Captcha en login** | 🟡 Implementado pero posiblemente bloqueante en dev | `captcha.service.ts` verifica server-side contra hCaptcha/reCAPTCHA. El comentario en `auth.service.ts` dice *"TEMPORAL PARA PRUEBAS LOCALES: sin servicio de captcha real configurado"*, pero la línea `await this.captchaService.verify(...)` **está activa, no comentada** — si no hay `CAPTCHA_SECRET_KEY` configurada, el login fallaría en cualquier entorno local. Posible inconsistencia entre el comentario y el código real |
| **Cabeceras de seguridad** | ✅ Implementado | `helmet()` con CSP estricta, HSTS 2 años, `frameguard: deny`, `noSniff`, `referrerPolicy: no-referrer`, `x-powered-by` deshabilitado |
| **HTTPS forzado** | ✅ Implementado | `HttpsRedirectMiddleware`, condicionado a `FORCE_HTTPS` |
| **CORS** | ✅ Restringido a orígenes explícitos (`ALLOWED_ORIGINS`), con credenciales |
| **CSRF** | 🟡 Dependencia declarada, uso no verificado | `csurf` está en `package.json` pero no se encontró invocación de `csurf()` en `main.ts` — el CORS sí permite el header `X-CSRF-Token`, sugiriendo intención, pero no hay middleware que lo verifique |
| **Validación de entrada** | ✅ Implementado | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` global — bloquea mass-assignment (ej. que alguien intente mandar `estado: 'APROBADO'` en el registro) |
| **Validación de archivos** | ✅ Implementado | `FileValidationPipe` usa `file-type` (magic bytes reales), no confía en el MIME declarado por el cliente; límite 15MB |
| **Manejo de errores** | ✅ Implementado | `AllExceptionsFilter` global — no filtra stack traces ni SQL al cliente |
| **Auditoría** | ❌ Tabla existe, no se usa | El modelo `Auditoria` está en el schema pero `git grep` no encontró ninguna referencia a él en `apps/api/src` — nada escribe en esa tabla |
| **Cifrado en reposo** | 🟡 No verificado | Existe `common/services/encryption.service.ts` (AES-256-GCM según el README de la autora) pero no se auditó dónde se usa realmente |
| **Variables de entorno validadas al arranque** | ✅ Implementado | `env.validation.ts`: `class-validator` sobre variables críticas (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`COOKIE_SECRET` ≥32 chars, `DATA_ENCRYPTION_KEY` hex de 64 chars) — si falta algo, el proceso no arranca |

**Conclusión de la sección:** la superficie de seguridad de la aplicación (Argon2id, JWT, throttling, cabeceras, validación) está genuinamente bien hecha y es más completa que lo que sugiere el estado general del proyecto. Pero **RLS y MFA están declarados como "hechos" en la documentación de la autora y no lo están** — es el hallazgo más importante de esta sección para no asumir seguridad donde no la hay.

---

## 7. Frontend

**No existe.** Cero código de frontend en todo el repositorio, en ninguna rama. `apps/web` no existe como directorio en ningún commit. Todo lo referente a React 18 + Vite + MUI + Workbox + Dexie.js (offline) es, hasta hoy, solo una decisión documentada en `docs/adr/001-stack.md` (§"Frontend") y en `docs/plan-maestro.md` (ADR-02/03/04) — **cero líneas de implementación**.

---

## 8. Gap analysis contra el SRS

**Aviso importante:** el texto que se pegó como "SRS" en el pedido es, en realidad, el mismo `README.md` del repositorio (arranque rápido, estructura, motor de riesgo, flujo de trabajo) — no contiene una lista formal de RF-01 a RF-20 con su redacción original. Esta sección reconstruye los RF a partir de las referencias cruzadas encontradas en `docs/plan-maestro.md` (backlog) y `docs/hallazgos.md` (que sí citan fragmentos textuales del SRS real al compararlos contra los Excel). Si existe un documento SRS más completo, no fue el que se pegó aquí y esta tabla debe revisarse contra él.

| RF | Descripción (inferida de la documentación interna) | Estado | Nota |
|---|---|---|---|
| RF-01 | Login, logout, recuperación de contraseña, JWT + refresh, 2FA opcional | 🟡 Parcial | Login/logout/refresh funcionan (rama sin fusionar). **Recuperación de contraseña no existe. 2FA está roto** (falta columna TOTP). Nada en `main` |
| RF-02 | Registro de Admin Empresa / Usuario Delegado con carta de autorización, flujo Pendiente→Aprobado/Rechazado | 🟡 Parcial | El flujo de estados existe (`registro` + `resolver`); la carta de autorización (`carta_autorizacion_id`) no está conectada en el módulo `usuarios` de la rama |
| RF-03 | Gestión de empresas y establecimientos, representantes | 🟡 Parcial | CRUD de `empresas` existe. **No hay módulo de `establecimientos`** — vacío real, no solo no verificado |
| RF-04 | Dashboards por rol, notificaciones | ❌ No iniciado | No hay frontend; el modelo `Notificacion` existe pero no se verificó ningún endpoint que lo sirva ni ningún productor que lo llene |
| RF-05 | Solicitud BPM por la empresa, guardado como borrador | ✅ Completo (a nivel de API) | `solicitudes-bpm`: crear borrador + enviar + listar propias, con ownership guard |
| RF-06 | Gestión unificada de casos, 4 escenarios de origen | 🟡 Parcial | 3 de 4 orígenes crean `Caso` (alertas-lapch, denuncias, solicitudes-bpm, verificado por `git grep "caso.create"`). **El 4to origen (programación institucional automática) no crea nada** — ver RF-07 |
| RF-07 | Programación institucional automática desde la frecuencia calculada; reprogramar/cancelar | ❌ No implementado en el backend TS | `db/05_funciones.sql` sí lo hace en SQL puro (`fn_procesar_evaluacion` inserta en `programacion_institucional`). `motor-riesgo.service.ts` (NestJS) calcula el riesgo pero **no cierra el ciclo** — no crea la programación ni el caso siguiente. Es el hallazgo más importante de todo el gap analysis: la pieza que la documentación llama "el hallazgo que define la arquitectura" no está portada al backend real |
| RF-08 | Alerta LAPCH: registrar, procede/no procede | ✅ Completo | `alertas-lapch`: registrar + resolver + listar |
| RF-09 | Denuncia: registrar, procede/no procede/remisión | ✅ Completo | `denuncias`: mismo patrón |
| RF-10 | Asignar/reasignar evaluador | ✅ Básico | `asignaciones`: asignar + listar propias. No verificado soporte de "reasignación" explícito ni "vista de carga por técnico" |
| RF-11 | Calendario del evaluador (día/semana/mes) | 🟡 Parcial | Solo un endpoint de rango de fechas; las "vistas" son responsabilidad del frontend inexistente |
| RF-12 | Captura de información general, iniciar/guardar/finalizar evaluación | 🟡 Parcial | `evaluaciones`: iniciar/respuestas/finalizar existen; no se auditó el detalle de `evaluaciones.service.ts` a fondo |
| RF-13 | Ficha BPM jerárquica dinámica, captura C/CP/IT/N-A | 🟡 Parcial (solo backend) | Catálogo servido por `formularios` (`GET vigente`); captura vía `evaluaciones`. Sin frontend, no hay "ficha dinámica" real para el usuario |
| RF-14 | Motor de cálculo: puntaje, %, RP, RE, RT, nivel de riesgo, frecuencia | ✅ **Completo y bien probado** | La pieza más madura del proyecto — implementación única en `packages/risk-engine`, 17 tests, integrada en `motor-riesgo.service.ts`, y verificación independiente en PL/pgSQL |
| RF-15 | Captura de evidencias: fotos, documentos, video, geolocalización | 🟡 Parcial | Subida de archivo con validación real implementada (`evidencias`); geolocalización es solo campos en el modelo, sin lógica de compresión/cola offline (no existe cliente que lo genere) |
| RF-16 | Generación de informe (resumen, hallazgos, NC, recomendaciones) en PDF | 🟡 Parcial, sin PDF | `informes.generar` existe pero produce texto estructurado, no PDF — ninguna librería de PDF está en `package.json` |
| RF-17 | Revisión del Coordinador (aprobar/devolver), bloqueo tras envío | 🟡 Parcial | `informes.revisar` existe; el trigger de bloqueo está en `db/01_schema.sql` pero no se verificó si está replicado en la migración Prisma |
| RF-18 | Gestión de correcciones por el evaluador y reenvío | ❌ No verificado / probablemente no implementado | No se encontró un endpoint específico de "corregir y reenviar" en ningún controlador |
| RF-19 | Cierre de expediente con resultado final | 🟡 Parcial | `expedientes.cerrar` existe |
| RF-20 | Consulta histórica con filtros (empresa, solicitud, evaluación, fecha, estado) | 🟡 Parcial | `expedientes.buscar` existe (`BuscarExpedientesQuery`), filtros exactos no auditados a fondo |
| RNF-01 | PWA offline: instalable, funciona sin conexión, sincroniza | ❌ No iniciado | Cero frontend, cero service worker, cero IndexedDB. La infraestructura de datos (`uuid_local`, `version_registro`, `operacion_pendiente`) está preparada en ambos esquemas de BD pero nada la consume |
| RNF-02 | Seguridad: RBAC, JWT, auditoría, cifrado | 🟡 Parcial | JWT/RBAC/Argon2id sólidos; auditoría sin implementar (tabla sin uso); RLS declarado pero no funcional (ver §6) |

---

## 9. Trabajo de otros colaboradores — qué revisar con el equipo

1. **Todo `apps/api/` es trabajo nuevo de Gabrielabdp (`gabyduverge03@gmail.com`), commit único de hoy, en una rama que nadie más ha tocado.** No proviene de ninguna sesión previa contigo. Antes de seguir desarrollando sobre él, el equipo debería decidir explícitamente si se fusiona, y en qué estado.
2. **Historia previa no documentada en `main`:** según `apps/api/COMPARACION_ARQUITECTURA.md` (que la propia autora dejó como registro), ella construyó **primero una implementación completamente distinta** (~25 tablas, sin soporte offline, RBAC como enum fijo, sin motor compartido) que "corría end-to-end con datos reales", y luego la reescribió contra el esquema "oficial" de 51 tablas — que es lo que terminó en el commit `7dd471a`. Esa primera versión no está en el repo (o no se encontró), pero el documento sugiere que hubo trabajo e iteración sustancial fuera de lo que este repositorio registra.
3. **Documentación duplicada/redundante de la autora:** `apps/api/COMPARACION_ARQUITECTURA.md` (181 líneas) y `apps/api/COMPARATIVO_ARQUITECTURA.md` (129 líneas) tienen nombres casi idénticos — probablemente un archivo quedó de un borrador anterior y no se limpió. Vale la pena revisar si uno debe eliminarse.
4. **Afirmaciones del `apps/api/README.md` que el código no respalda:** el checklist de seguridad de ese README afirma RLS como implementado ("políticas por tabla sensible") cuando `hardening.sql` está vacío de políticas reales (ver §2.5 y §6). Esto no es necesariamente mala fe — el propio `hardening.sql` documenta que es un remanente de la versión anterior de 25 tablas que quedó pendiente de reescribir — pero el README no se actualizó para reflejarlo. Quien siga trabajando en esa rama debería corregir esa discrepancia antes de que alguien más la tome como cierta.
5. **Convención de nombres consistente con el resto del proyecto:** vale la pena notar, a favor, que el código de Gabriela sí seguyó las convenciones ya establecidas en `main` (español para el dominio, inglés para lo técnico — regla de `CONTRIBUTING.md`) y reutilizó `packages/risk-engine` en vez de reimplementar el motor, respetando la regla central del proyecto ("ningún número del dominio en el código"). No hay señales de que haya ignorado las convenciones del equipo — el problema es más de sincronización (dos esquemas de BD divergentes, ver §2.4) que de estilo.
6. **Nadie ha commiteado como el usuario de esta sesión** (`jorgemelo1014@gmail.com`) en ningún branch — los tres commits de `main` son de `AshFranco`/`Ash`, y el de la rama es de `Gabrielabdp`. Si tu rol es de coordinación/revisión más que de autoría directa de commits, tenlo en cuenta al decidir cómo fusionar este trabajo.

---

## Resumen ejecutivo (para no leer todo lo de arriba)

- **`main` es casi solo SQL + motor de riesgo + documentación.** Sólido, consistente, bien probado, pero sin ningún servidor HTTP ni frontend.
- **Hay un backend NestJS+Prisma completo y razonablemente serio en una rama sin fusionar**, hecho hoy por una colaboradora. Cubre la mayoría de los módulos del SRS a nivel de API, con seguridad genuinamente buena en varios aspectos (Argon2id, JWT, throttling, validación) — pero con vacíos concretos: no cierra el ciclo de programación automática (la pieza arquitectónica central del proyecto), RLS y MFA están declarados pero no funcionan, no hay auditoría real, no hay PDF, y el schema de Prisma ha divergido del SQL "oficial" de `main` en 9 tablas (6 faltantes, 3 añadidas sin documentar formalmente).
- **No existe frontend en absoluto**, por lo que RNF-01 (offline/PWA) — el requisito no funcional más citado como "el mayor riesgo técnico" en la documentación — está en cero.
- **Antes de seguir desarrollando**, las decisiones que bloquean todo lo demás son: (a) si se fusiona la rama de Gabriela y en qué estado, (b) reconciliar los dos esquemas de base de datos divergentes, y (c) resolver A-01/A-02 (bloqueantes documentados desde el inicio del proyecto y que siguen sin respuesta de la DIGEMAPS).
