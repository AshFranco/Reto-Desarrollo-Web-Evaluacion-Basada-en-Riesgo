# Re-auditoría del estado real del repositorio — EBR/BPM

**Generado:** 2026-09-06, leyendo código y probando el proyecto localmente (instalación real de dependencias, build, pruebas, e intento de arranque del backend y del frontend).
**Compara contra:** `CONTEXTO_PROYECTO.md` (auditoría del 2026-09-03).
**Método:** `git fetch` + inspección de `git log`/`git diff` sobre las ramas remotas, más ejecución real de `npm install`, `npm run build`, `npm test` y arranque de ambos servidores en este entorno. Se señala explícitamente cuándo algo no pudo verificarse en vivo y por qué.

---

## 0. Resumen ejecutivo (léelo si no tienes tiempo para todo)

Mucho cambió en menos de 24 horas desde la auditoría del 03-09. En orden de importancia para ti (Frontend Aplicación):

1. **`feat/EBR-backend-api` ya se fusionó — pero solo a `main`, no a `develop`.** Si trabajas desde `develop` (como manda `CONTRIBUTING.md`), hoy no tienes el backend ni la carpeta `docs/especificacion/` disponibles. Esto es una anomalía real de las ramas, no un supuesto — verificada con `git merge-base --is-ancestor`.
2. **Nada de lo señalado como vacío en la auditoría anterior se corrigió**: el ciclo (RF-07) sigue sin cerrarse en el backend, RLS y MFA siguen rotos exactamente igual. Verificado con un `git diff` vacío entre el commit original del backend y su estado actual en `main`.
3. **`apps/web` ya existe — pero es pura infraestructura PWA/offline (obra de "Ash", rol Frontend PWA), cero pantallas.** No hay dashboards, ni formularios, ni la ficha BPM renderizada. Esa es literalmente tu parte, y el punto de partida está vacío de UI, como se esperaba por la división de roles en `00-EQUIPO.md`.
4. **El frontend arranca y corre hoy sin ninguna base de datos**, porque en modo desarrollo usa respuestas simuladas (MSW) para 8 endpoints. Pude verificarlo en vivo: `npm run dev` sirve la app en `http://localhost:5173` con HTTP 200 real.
5. **El backend NO pude probarlo en vivo — y tampoco vas a poder tú sin Docker.** No hay PostgreSQL ni Docker disponibles en este entorno de auditoría. Al intentar arrancarlo igual, confirmé algo importante: **el backend no abre su puerto en absoluto si no hay una base de datos alcanzable** — se cae por completo antes de poder responder ni siquiera un healthcheck. Esto es información nueva y verificada, no estaba confirmado en la auditoría anterior.
6. **Encontré un defecto real y reproducible en `apps/web`: `npm run build` falla.** `tsc -b` da 5 errores de compilación (falta `vite-env.d.ts`, más un error de tipos en `sync/processor.ts`). El modo desarrollo (`npm run dev`) y las pruebas (`npm test`) sí funcionan porque no hacen chequeo de tipos completo — pero el build de producción, tal como está en el repo ahora mismo, no compila.

---

## 1. Estado de la rama del backend

### ¿Se fusionó?

**Sí, `feat/EBR-backend-api` se fusionó — a `main`, el 2026-09-04 a las 00:05, vía PR #1** (commit de merge `4bce8f7`, mergeado por la cuenta `AshFranco`). La rama remota `origin/feat/EBR-backend-api` todavía existe (no fue borrada), pero ya no es la única fuente del backend: su contenido vive ahora en `main`.

**Importante — no se fusionó a `develop`.** Verificado con:
```
git merge-base --is-ancestor origin/main origin/develop   → NO
git merge-base --is-ancestor origin/develop origin/main   → SÍ
```
Es decir: `develop` es ancestro de `main` (todo lo de `develop` está en `main`), pero `main` tiene commits que `develop` nunca recibió — exactamente el merge del backend (`4bce8f7`) y el merge de mi PR de documentación (`d5dab02`, ver más abajo). Confirmado también mirando el árbol de archivos directamente:

| Ruta | ¿Existe en `origin/main`? | ¿Existe en `origin/develop`? |
|---|:---:|:---:|
| `apps/api/` | ✅ Sí | ❌ No |
| `apps/web/` | ✅ Sí | ✅ Sí |
| `docs/especificacion/` | ✅ Sí | ❌ No |

Esto contradice el flujo de trabajo normal descrito en `CONTRIBUTING.md` (`main ← develop ← feature branches`). Aquí ocurrió al revés: el backend y la documentación se fusionaron directo a `main`, y por separado `develop` acumuló el trabajo de frontend (18 commits de "Ash", ver §2) desde el mismo punto de partida (`d62fd73`) sin incorporar nunca esos otros dos merges. Luego `develop` se fusionó a `main` (PR #4, `6a4c4c0`, 2026-09-04 00:24), pero nadie fusionó `main` de vuelta a `develop`.

**Consecuencia práctica para ti:** si creas tu rama de trabajo desde `develop` (como indica `CONTRIBUTING.md`), no vas a tener `apps/api` ni `docs/especificacion` disponibles localmente. Vas a necesitar que alguien fusione `main` → `develop` primero, o crear tu rama desde `main` en su lugar. Esto no es una suposición — es el estado verificado ahora mismo de las referencias remotas.

### Si se fusionó: ¿se corrigieron los vacíos señalados?

**No, ninguno.** Verificado de la forma más directa posible: `git diff 7dd471a origin/main -- apps/api` (7dd471a es el commit original de Gabriela antes de fusionar) devuelve **vacío**. El código de `apps/api` en `main` hoy es **byte por byte idéntico** al que audité el 03-09. Específicamente:

- **Reconciliación de esquemas (`db/01_schema.sql` vs `schema.prisma`):** no se tocó. `schema.prisma` sigue con 43 modelos, las mismas 6 tablas faltantes (`actividad_economica`, `literal_item`, `evaluacion_participante`, `documento`, `importacion_excel`, `importacion_detalle`) y los mismos 3 modelos no documentados en el esquema oficial (`RefreshToken`, `InformeEvaluacion`, `Expediente`).
- **Cierre del ciclo (`fn_procesar_evaluacion` → `motor-riesgo.service.ts`):** no se portó. El archivo es idéntico al auditado; sigue sin crear `ProgramacionInstitucional` ni el `Caso` siguiente tras calcular el riesgo.
- **`hardening.sql` con políticas RLS reales:** no se reescribió. El archivo sigue siendo únicamente el comentario "PENDIENTE DE REESCRITURA", sin un solo `CREATE POLICY`.

Todo lo demás descrito en `07-SEGURIDAD.md` (Argon2id, JWT, throttling, validación, cabeceras) tampoco cambió, por la misma razón: cero commits tocaron `apps/api` desde el merge.

---

## 2. Estado del frontend

### Todas las ramas remotas (`git branch -r`, verificado hoy)

```
origin/HEAD -> origin/main
origin/develop
origin/docs/EBR-070-especificacion-funcional
origin/feat/EBR-backend-api
origin/main
```

No hay ninguna rama nueva de frontend por separado — el trabajo de frontend se hizo directo sobre `develop`.

### ¿Existe `apps/web`? ¿En qué ramas?

**Sí, existe, en `develop` y en `main`** (llegó a `main` vía el merge de `develop`, PR #4). Confirmado con `git ls-tree` sobre ambas referencias remotas.

### Cronología exacta (por autor y hora, `git log --format`)

Todo el trabajo de `apps/web` lo hizo **AshFranco** (rol "Frontend PWA" según `00-EQUIPO.md`), en 18 commits entre el **2026-09-03 23:22** y el **2026-09-04 00:22** — es decir, en una sola sesión de aproximadamente una hora, el mismo día en que se fusionó el backend. No hay commits de ningún otro autor en `apps/web`.

### Stack real (verificado en `apps/web/package.json`, no en documentación)

**Es React + Vite + MUI simultáneamente** — no hubo que elegir entre las dos fuentes que la auditoría anterior marcaba como no reconciliadas (README vs ADR-001). Confirmado por dependencias reales instaladas:

- `react` 18.3.1, `react-dom` 18.3.1, `react-router-dom` 6.27 (pero con **una sola ruta declarada**, ver abajo)
- `vite` 5.4.9 + `@vitejs/plugin-react`
- `@mui/material` 6.1.3, `@mui/icons-material`, `@emotion/react`/`styled` (dependencias de MUI)
- `@tanstack/react-query` 5.59 (`QueryClientProvider` ya está en `App.tsx`)
- `zustand` 5.0 (declarado como dependencia; **no encontré ningún store de Zustand usado todavía** en el código — está instalado, no usado)
- `dexie` 4.0.8 (IndexedDB)
- `workbox-precaching`, `workbox-routing`, `workbox-strategies`, `vite-plugin-pwa` 0.21

### Qué pantallas o componentes existen — **ninguna**

Listado completo y real de `apps/web/src/` (todo el árbol, sin omitir nada):

```
App.tsx                         — shell: QueryClientProvider + ThemeProvider MUI + BrowserRouter,
                                   UNA sola ruta ("/") que renderiza un <div> con el texto
                                   "EBR — infraestructura lista". Nada más.
main.tsx                        — bootstrap, arranca MSW en modo dev antes de montar React
sw.ts                            — service worker real (Workbox, injectManifest)
mocks/browser.ts, handlers.ts, node.ts   — mocks de MSW para 8 endpoints (ver §4)
lib/auth/session.ts, refresh.ts           — sesión en Dexie, refresh silencioso vía cookie
lib/catalogo/flatten.ts, loader.ts        — aplana el árbol jerárquico de la ficha BPM y lo descarga a Dexie
lib/db/index.ts, schema.ts                — esquema Dexie completo, 8 tablas
lib/fotos/compressor.ts                    — compresión de fotos a 800px JPEG 0.7
lib/sync/queue.ts, processor.ts, useSyncStatus.ts   — cola de sincronización offline con backoff exponencial
lib/motor/useMotorRiesgo.ts                — STUB: devuelve `null` siempre, comentario explícito
                                              "TODO: implementar cuando el backend exponga
                                              factores, rangos y reglaAprobacion"
lib/types.ts                               — tipos compartidos
```

**No existe `src/pages/`, `src/components/`, `src/features/`, ni ninguna carpeta de pantallas.** No hay login screen, no hay dashboard, no hay formulario de ficha BPM, no hay nada de UI real más allá del placeholder de una línea en `App.tsx`. Esto confirma exactamente el reparto de roles de `00-EQUIPO.md`: Ash construyó la capa de infraestructura PWA/offline (que es sustancial y está bien probada — ver abajo), y la capa de "pantallas y lógica de negocio del frontend" es tu parte, sin empezar.

### ¿Capacidades PWA reales o solo configuración?

**Reales, verificadas en vivo, no solo config.** Levanté el servidor de desarrollo (`npm run dev -w apps/web`) y confirmé con `curl`:

- `http://localhost:5173/` → **HTTP 200**, sirve el `index.html` real con el `<link rel="manifest">` inyectado y el script de registro del service worker.
- `http://localhost:5173/manifest.webmanifest` → **HTTP 200** (nombre "EBR — Evaluación Basada en Riesgo", ícono, `theme_color`, `display: standalone`, todo real, no placeholder).
- `http://localhost:5173/sw.js` → **HTTP 200** (Workbox con `devOptions.enabled: true` genera el SW también en modo dev).

Y las **39 pruebas unitarias existentes pasan**, verificado ejecutando `npm test -w apps/web` (no asumido, corrido de verdad):
```
10 archivos de prueba, 39 pruebas — TODAS pasan
(auth/session, auth/refresh, catalogo/flatten, catalogo/loader, db/schema,
 fotos/compressor, sync/queue, sync/processor, sync/useSyncStatus, motor/useMotorRiesgo)
```

**Pero el build de producción falla.** Ejecuté `npm run build -w apps/web` (que corre `tsc -b && vite build`) y **no completa** — se detiene en la verificación de tipos con 5 errores:

```
src/lib/auth/refresh.ts(3,30): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
src/lib/catalogo/loader.ts(5,30): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
src/lib/sync/processor.ts(6,30): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
src/lib/sync/processor.ts(67,11): error TS2769: (headers Authorization: string | undefined
                                   no asignable a HeadersInit)
src/main.tsx(6,19): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
```

Causa raíz confirmada: **no existe `src/vite-env.d.ts`** en ningún lugar del proyecto, y `tsconfig.app.json` no declara `"types": ["vite/client"]` — por eso TypeScript no reconoce `import.meta.env.*`, que se usa en tres archivos para leer la URL del API. Es un descuido de configuración, no un error de lógica, y el arreglo es de una línea (agregar el archivo o el `types` en el tsconfig) — pero **tal como está el repo hoy, `npm run build` no funciona**, y `npm run dev`/`npm test` sí funcionan porque ninguno de los dos hace verificación de tipos completa del proyecto (Vite transpila con esbuild sin chequear tipos; Vitest solo tipa lo que cada test importa, sin ejecutar `tsc -b`).

---

## 3. Comparación contra `CONTEXTO_PROYECTO.md` (2026-09-03)

| Punto de la auditoría anterior | Estado al 03-09 | Estado hoy (06-09) | Cambió? |
|---|---|---|---|
| `feat/EBR-backend-api` sin fusionar | 🟡 Rama aparte | ✅ Fusionada a `main` (no a `develop`) | **Sí** |
| `docs/especificacion/` (mi PR) | Recién abierto como PR #2 (`--base develop`) | ✅ Fusionado a `main`, pero no como PR #2: ese se **cerró sin fusionar** (confirmado con `gh pr list --state all`), y se abrió un PR #3 nuevo desde la misma rama, esta vez con base `main`, que sí se fusionó (`d5dab02`). El commit (`31cf88c`) es el mismo; lo que cambió fue la rama destino | **Sí** |
| `apps/web` no existe en ninguna rama | ❌ No existía | 🟡 Existe en `develop` y `main`, pero solo infraestructura, cero pantallas | **Sí (parcial)** |
| Esquemas `db/01_schema.sql` vs `schema.prisma` divergentes (9 tablas) | 🟡 Sin reconciliar | 🟡 Exactamente igual, sin reconciliar (diff vacío) | **No** |
| RF-07 (cierre del ciclo) no portado al backend | ❌ No implementado | ❌ Exactamente igual (diff vacío) | **No** |
| RLS declarado pero no funcional | ❌ Sin políticas reales | ❌ Exactamente igual (diff vacío) | **No** |
| MFA declarado pero roto | ❌ Falta columna TOTP | ❌ Exactamente igual (diff vacío) | **No** |
| Sin recuperación de contraseña | ❌ No existe | ❌ Sin cambios | **No** |
| Sin módulo de `establecimientos` | ❌ No existe | ❌ Sin cambios | **No** |
| Auditoría sin uso real | ❌ Tabla sin escrituras | ❌ Sin cambios | **No** |
| Sin generación de PDF | ❌ No hay librería | ❌ Sin cambios | **No** |
| RNF-01 (PWA offline) en cero | ❌ Cero frontend | 🟡 Infraestructura PWA/offline real y probada; **cero pantallas que la usen** todavía | **Sí (parcial)** |
| CI solo cubre `risk-engine` y `db/*.sql` | Confirmado | No verificado si cambió — no se revisó `ci.yml` en esta pasada porque no es lo que pediste, pero no hay evidencia de que se haya tocado (ningún commit reciente lo menciona) | No verificado |

**Resumen de lo nuevo que la auditoría anterior no podía saber:**
1. El backend se fusionó (a `main`, no a `develop` — matiz importante).
2. Existe una rama con `apps/web` completo en su capa de infraestructura.
3. El backend **no arranca sin base de datos alcanzable** — confirmado en vivo, no era un hecho verificado antes.
4. El build de producción del frontend está roto — defecto nuevo, específico de código que no existía el 03-09.
5. `main` y `develop` divergieron de una forma que contradice el flujo de trabajo documentado.

---

## 4. Lo que necesitas para empezar tu parte (Frontend Aplicación)

### ¿Hay una API corriendo y accesible que puedas consumir?

**No, y no pude levantarla yo tampoco — con una causa concreta y verificada, no una suposición.** Este entorno de auditoría no tiene Docker ni PostgreSQL instalados (confirmado: `docker` no existe en el PATH, nada escucha en el puerto 5432, no hay binarios de `postgres`/`pg_ctl`/`initdb` en el sistema). Intenté arrancar el backend real de todos modos (`npm install`, `npx prisma generate`, `npm run start:dev`, con variables de entorno válidas) para ver hasta dónde llegaba, y esto es lo que confirmé:

- `npm install` en `apps/api`: **funciona**, sin errores de dependencias.
- Compilación TypeScript (`nest start --watch`): **funciona**, 0 errores.
- `npx prisma generate`: **funciona**, el schema es válido.
- Validación de variables de entorno al arranque: **funciona exactamente como documenta el código** (rechazó mi primer intento por una clave de cifrado de longitud incorrecta, con el mensaje de error exacto que define `env.validation.ts`).
- **Arranque completo del servidor HTTP: falla siempre sin PostgreSQL, sin excepción.** `PrismaService.onModuleInit()` llama a `$connect()` de forma obligatoria antes de que Nest termine de inicializar la aplicación. Si la base de datos no responde, la promesa de inicialización del módulo rechaza, Nest aborta todo el arranque, y `app.listen()` **nunca se ejecuta** — confirmé con `curl` que ningún puerto queda escuchando (`HTTP 000`, conexión rechazada) tanto en la ruta raíz como en un endpoint público.

**Consecuencia directa para ti:** cuando tengas Docker instalado, `docker compose up -d` (el de la raíz del repo) más `cd apps/api && npx prisma migrate deploy && npx prisma db seed` te dará un backend real contra el que probar. Pero **hasta que tengas Postgres corriendo de una forma u otra, ningún endpoint del backend va a responder — ni siquiera uno público como login**. No hay un modo degradado.

**Ningún endpoint del backend fue verificado respondiendo hoy.** No lo doy por hecho ni lo niego sin más: lo intenté, y la razón concreta por la que no pude es la de arriba, no falta de esfuerzo ni suposición.

### ¿Existe ya una estructura base de `apps/web` donde integrar tus pantallas?

**Sí, existe, y no tienes que crear la carpeta desde cero.** Lo que ya está listo y puedes usar directamente:

- `App.tsx` con `QueryClientProvider` (React Query) y `ThemeProvider` de MUI ya configurados — solo falta agregar tus rutas dentro de `<Routes>`.
- `lib/auth/session.ts` y `refresh.ts` — gestión de sesión ya resuelta (guardar/leer/limpiar sesión en Dexie, refresh silencioso).
- `lib/catalogo/loader.ts` y `flatten.ts` — descarga y aplanado del árbol de la ficha BPM ya resuelto.
- `lib/sync/*` — cola de sincronización offline completa y probada (39 tests pasando).
- `lib/fotos/compressor.ts` — compresión de evidencias fotográficas ya resuelta.
- `lib/db/schema.ts` — esquema Dexie con las 8 tablas locales ya definido.

Lo que **no existe y es tu trabajo**: cualquier componente visual, cualquier pantalla, cualquier ruta más allá del placeholder de `/`, y la integración de `packages/risk-engine` en la UI (`useMotorRiesgo` es un stub que siempre devuelve `null` — vas a necesitar completarlo tú, o coordinarlo con quien lo dejó así, una vez el backend exponga los datos de factores/rangos que ese hook necesita).

**Antes de escribir código, dos cosas a resolver, no asumir:**
1. **Arregla o pide que arreglen el build roto** (`vite-env.d.ts` faltante) antes de construir sobre esto — si no, vas a heredar un proyecto que no compila para producción, aunque `npm run dev` te deje trabajar sin darte cuenta del problema.
2. **Confirma desde qué rama vas a trabajar.** Si es `develop`, hoy no vas a tener `apps/api` para consultar el código real de los endpoints ni `docs/especificacion/` para consultar el diseño de API — vas a necesitar que alguien traiga `main` de vuelta a `develop` primero, o trabajar contra `main` directamente mientras eso se resuelve.

### Qué endpoints de `06-API.md` responden hoy si levantas el backend localmente

**No pude confirmar ninguno respondiendo — por la razón exacta explicada arriba (sin Postgres, el servidor nunca abre el puerto).** No es una lista parcial de "estos sí, estos no": es que **cero** endpoints pudieron probarse en vivo en este entorno, incluidos los marcados `@Public()` como login, porque el fallo ocurre antes de que Nest empiece a enrutar peticiones, no a nivel de cada endpoint.

Lo que **sí puedo confirmar sobre el conjunto de endpoints**, por lectura de código (sin ejecución, y ya estaba confirmado en la auditoría anterior — no cambió, ver §3):
- Los 16 controladores y sus rutas listados en `docs/especificacion/06-API.md` existen tal cual en el código fuente (verificado de nuevo hoy con `git diff` vacío contra el commit original).
- Ninguno de ellos fue nunca ejecutado con éxito contra una base de datos real, ni en esta auditoría ni (hasta donde el código y los commits muestran) en la anterior.

**Cuando tú sí tengas Docker/Postgres disponibles**, la forma correcta de responder esta misma pregunta por ti mismo es: levantar `docker compose up -d`, correr las migraciones y el seed, arrancar `npm run start:dev` en `apps/api`, y pegarle con `curl` o Postman a cada ruta de `06-API.md` una por una — no confíes en que "el controlador existe" signifique "el endpoint funciona": ya vimos en esta misma auditoría que compilar y arrancar no es lo mismo que responder peticiones.

---

## 5. Qué no se verificó en esta pasada (limitaciones honestas)

- **Ningún endpoint HTTP del backend respondiendo con datos reales** — bloqueado por falta de PostgreSQL/Docker en este entorno, no por falta de intento (ver §4).
- **CI (`.github/workflows/ci.yml`)**: no se releyó en esta pasada; no hay evidencia de que haya cambiado, pero tampoco se confirmó explícitamente.
- **Contenido de `apps/api/docker-compose.yml`** (el propio de esa carpeta, distinto al de la raíz): sigue sin auditarse, igual que en la pasada anterior.
- **`docs/contratos/`**: los commits de `develop` mencionan "actualizar contratos 01-03 y spec/plan PWA desde código real" (`2436451`) — no se releyó el contenido actualizado de esos contratos en esta auditoría; si los vas a usar como referencia, conviene releerlos de nuevo, ya que se actualizaron después de la auditoría del 03-09.
- **Uso real de Zustand**: está en `package.json` pero no encontré ningún store usado en el código leído; no se hizo una búsqueda exhaustiva línea por línea de todo `apps/web` para descartarlo del todo.
