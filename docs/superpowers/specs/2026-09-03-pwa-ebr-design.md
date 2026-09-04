# Spec — Infraestructura PWA EBR (Integrante 3)

**Fecha:** 2026-09-03  
**Autor:** Integrante 3 (Ash — Frontend PWA)  
**Fuentes:** código en `feat/EBR-backend-api`, `docs/especificacion/`, contratos 01–04  
**Estado:** Aprobado — base para el plan de implementación

---

## 1. Alcance

Este spec cubre exclusivamente el trabajo del Integrante 3: la infraestructura
PWA de `apps/web` que hace posible trabajar sin conexión y sincronizar cuando
vuelve la red. **No cubre** las pantallas de la aplicación (Integrante 4) ni el
backend (Integrante 1).

Fases:
- **A:** Fundación PWA (monorepo, Vite, service worker, manifest)
- **B:** IndexedDB con Dexie (9 tablas tipadas)
- **C:** Autenticación offline
- **D:** Catálogo offline (formulario de inspección)
- **E:** Cola de sincronización y envío de respuestas
- **F:** Captura y compresión de fotos

---

## 2. Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Vite | 5 | Bundler y dev server |
| React | 18 | UI |
| TypeScript | 5 | Tipado estático |
| MUI (Material UI) | v6 | Componentes visuales (requerido por SRS) |
| vite-plugin-pwa | 0.21 | InjectManifest mode — control total sobre sw.ts |
| Workbox | 7 | Estrategias de caché en el service worker |
| Dexie.js | 4 | Wrapper tipado sobre IndexedDB |
| TanStack Query | v5 | Estado de servidor (peticiones con red) |
| Zustand | 5 | Estado global mínimo (usuario, sync status) |
| MSW | 2 | Mocks de API para tests y desarrollo sin backend |
| Vitest | 2 | Tests unitarios |
| fake-indexeddb | 6 | IndexedDB en Node.js para tests |

---

## 3. Contrato con el backend (fuente: código real en `feat/EBR-backend-api`)

### 3.1 Autenticación

**Login** — `POST /api/v1/auth/login`
```json
Body: { "correo": "", "password": "", "captchaToken": "" }

Respuesta: {
  "accessToken": "<JWT 15 min>",
  "usuario": { "id": "12", "nombreCompleto": "Ana Pérez", "rol": "TECNICO_EVALUADOR", "empresaId": null }
}
```

JWT payload: `{ sub: string, rol: string, empresaId: string|null }`  
`rol` es **singular** (string), `id` es **string** (BigInt serializado).  
`refreshToken` NO está en el JSON — viaja en cookie `httpOnly` gestionada por el navegador.

**Refresh** — `POST /api/v1/auth/refresh`  
Sin body. Cookie enviada automáticamente. Respuesta: `{ "accessToken": "<nuevo JWT>" }`

**Logout** — `POST /api/v1/auth/logout` (requiere Bearer token)

### 3.2 Catálogo de la ficha

**GET** `/api/v1/formularios/vigente` (requiere Bearer)

```json
{
  "id": "1",
  "secciones": [
    {
      "id": "45", "idPadre": null, "numeracion": "1", "titulo": "Infraestructura",
      "nivel": 1, "orden": 1, "esEvaluable": false, "peso": 0, "idCriticidad": null,
      "hijos": [
        { "id": "46", "idPadre": "45", ..., "esEvaluable": true, "peso": 1.0, "idCriticidad": "1", "hijos": [] }
      ]
    }
  ],
  "opcionesRespuesta": [
    { "id": "1", "codigo": "C",   "valor": 1.0, "excluyeDelCalculo": false, "generaNc": false },
    { "id": "2", "codigo": "CP",  "valor": 0.5, "excluyeDelCalculo": false, "generaNc": true  },
    { "id": "3", "codigo": "IT",  "valor": 0.0, "excluyeDelCalculo": false, "generaNc": true  },
    { "id": "4", "codigo": "N/A", "valor": 0.0, "excluyeDelCalculo": true,  "generaNc": false }
  ]
}
```

El árbol llega **anidado** (`hijos`). El frontend lo aplana al guardarlo en IndexedDB.  
Todos los IDs son **strings**. Campo `secciones` (no `items`), `opcionesRespuesta` (no `opciones`).

**Brecha conocida:** No incluye factores de riesgo, rangos ni reglaAprobacion — pending endpoint por parte de Integrante 1.

### 3.3 Evaluaciones y sincronización

```
POST /api/v1/evaluaciones/:id/iniciar
POST /api/v1/evaluaciones/:id/respuestas     body: { respuestas: RespuestaItemDto[] }
POST /api/v1/evaluaciones/:id/finalizar      body: { observacionesFinales?: string }
```

`RespuestaItemDto`:
```typescript
{ itemId: string; codigoOpcion: 'C'|'CP'|'IT'|'N/A'; nivelCriticidad?: 'C'|'M'|'Me'; observacion?: string }
```
`nivelCriticidad` es **obligatorio** cuando `codigoOpcion` es `'CP'` o `'IT'`.

El servidor hace `upsert` por `(evaluacion, item)` — reenviar es idempotente.

### 3.4 Evidencias

```
POST /api/v1/evidencias
Content-Type: multipart/form-data

archivo: <Blob JPEG>
evaluacionId: "42"
respuestaItemId: "45"   (opcional)
tipo: "FOTO"
```

El servidor acepta hasta 15 MB. El cliente debe comprimir a ≤ 300 KB antes de subir.

### 3.5 Asignaciones

```
GET /api/v1/asignaciones/mias
```

Devuelve asignaciones activas con `caso.establecimiento.nombre` y `.calle`.

---

## 4. Estructura de archivos

```
ebr-bpm/
├── package.json                          — workspace root (npm workspaces)
├── packages/risk-engine/                 — motor de riesgo (ya existe)
└── apps/web/
    ├── package.json
    ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
    ├── vite.config.ts                    — VitePWA InjectManifest
    ├── vitest.config.ts
    ├── index.html
    ├── public/
    │   ├── icon.svg / icon-192.png / icon-512.png
    │   └── mockServiceWorker.js          — generado por MSW
    └── src/
        ├── sw.ts                         — service worker
        ├── main.tsx                      — entry point
        ├── App.tsx                       — shell (QueryClient, MUI, Router)
        ├── test/setup.ts                 — fake-indexeddb + MSW server
        ├── mocks/
        │   ├── handlers.ts               — MSW handlers con datos reales del backend
        │   ├── node.ts                   — servidor MSW para Vitest
        │   └── browser.ts                — worker MSW para dev
        └── lib/
            ├── types.ts                  — tipos locales
            ├── db/
            │   ├── schema.ts             — clases y interfaces Dexie
            │   └── index.ts              — singleton db
            ├── auth/
            │   ├── session.ts            — guardar/leer/limpiar sesión en IndexedDB
            │   └── refresh.ts            — silentRefresh (llama /refresh, cookie automática)
            ├── catalogo/
            │   ├── flatten.ts            — aplanar árbol anidado → lista plana
            │   └── loader.ts             — descargar y guardar catálogo en IndexedDB
            ├── motor/
            │   └── useMotorRiesgo.ts     — hook (retorna null hasta que haya datos de factores)
            ├── fotos/
            │   └── compressor.ts         — comprimirFoto: 800px JPEG 0.7, doble pasada
            └── sync/
                ├── queue.ts              — enqueue / getPendientes / marcarEnviada / marcarError
                ├── processor.ts          — SyncProcessor: iniciar → respuestas → fotos → finalizar
                └── useSyncStatus.ts      — hook: pendientes, enLinea, sincronizando
```

---

## 5. Esquema Dexie (9 tablas)

```typescript
class EbrDatabase extends Dexie {
  sesion!: EntityTable<SesionLocal, 'id'>;                   // id=1, accessToken, expiresAt, usuario
  catalogo_item!: EntityTable<CatalogoItemLocal, 'id'>;      // id(string), versionFichaId, idPadre, ...
  catalogo_meta!: EntityTable<CatalogoMetaLocal, 'id'>;      // id=1, versionFichaId, opcionesRespuesta
  evaluacion!: EntityTable<EvaluacionLocal, 'uuidLocal'>;    // uuidLocal, evaluacionServerId, estado
  respuesta!: EntityTable<RespuestaLocal, 'uuidLocal'>;      // uuidLocal, evaluacionUuid, itemId, ...
  evidencia!: EntityTable<EvidenciaLocal, 'uuidLocal'>;      // uuidLocal, blob, subida
  cola_sync!: EntityTable<OperacionPendiente, 'uuidLocal'>;  // uuidLocal, tipo, payload, estado, intentos
  asignacion!: EntityTable<AsignacionLocal, 'id'>;           // id, casoId, estado, establecimiento
}

// Índices
sesion:           'id'
catalogo_item:    'id, versionFichaId, idPadre'
catalogo_meta:    'id'
evaluacion:       'uuidLocal, evaluacionServerId, estado'
respuesta:        'uuidLocal, evaluacionUuid, itemId'
evidencia:        'uuidLocal, evaluacionUuid, subida'
cola_sync:        'uuidLocal, tipo, estado, timestamp'
asignacion:       'id, estado'
```

Nota: se eliminó `catalogo_literal` — el backend no expone literales de ítems. Los ítems son los nodos hoja directamente.

---

## 6. Service Worker — estrategias Workbox

```
/api/v1/formularios/*   → NetworkFirst (cacheName: 'api-catalogo', timeout 3s)
/api/v1/asignaciones/*  → NetworkFirst (cacheName: 'api-catalogo', timeout 3s)
/api/v1/auth/*          → NetworkOnly  (nunca cachear tokens)
/api/v1/evaluaciones/*  → NetworkOnly  (escrituras offline van por cola, no por SW)
/api/v1/evidencias/*    → NetworkOnly  (escrituras offline van por cola)
GET resto               → StaleWhileRevalidate (cacheName: 'api-general')
Shell estático          → precacheAndRoute (self.__WB_MANIFEST)
```

---

## 7. Cola de sincronización

### Tipos de operación en `cola_sync`

```typescript
type TipoOperacion = 'INICIAR_EVALUACION' | 'RESPUESTAS' | 'EVIDENCIA' | 'FINALIZAR_EVALUACION';
```

### Flujo del SyncProcessor

```
al recuperar red:
  1. silentRefresh (si accessToken expirado)
  2. Por cada evaluación con operaciones pendientes:
     a. INICIAR_EVALUACION  → POST /api/v1/evaluaciones/:id/iniciar
     b. RESPUESTAS          → POST /api/v1/evaluaciones/:id/respuestas (todo el batch local)
     c. EVIDENCIA (c/u)     → POST /api/v1/evidencias
     d. FINALIZAR_EVALUACION → POST /api/v1/evaluaciones/:id/finalizar
  3. Marcar operaciones como enviadas en IndexedDB
```

### Backoff exponencial

```typescript
calcularBackoff(intentos: number): number {
  return Math.min(Math.pow(2, intentos) * 1000, 300_000); // máx 5 min
}
```

Máximo 10 intentos por operación. Al llegar a 10, estado → `'error'` (requiere intervención manual).

---

## 8. Autenticación offline

- `sesion` en IndexedDB guarda: `{ id: 1, accessToken, expiresAt, usuario }`.
- `refresh.ts`: llama `POST /api/v1/auth/refresh` sin body. Cookie enviada automáticamente por el navegador.
- Si refresh responde `200`: guarda nuevo `accessToken` + `expiresAt`.
- Si refresh responde `401`/`403`: sesión expirada. Banner informativo. Datos locales preservados.

---

## 9. Compresión de fotos

```typescript
// compressor.ts
const MAX_SIDE = 800;       // px en el lado mayor
const QUALITY_1 = 0.7;
const QUALITY_2 = 0.5;      // segunda pasada si >300 KB
const MAX_BLOB_SIZE = 300_000;  // bytes
```

Usa `OffscreenCanvas` si disponible (workers), `HTMLCanvasElement` como fallback (Safari).

---

## 10. Mocks MSW (desarrollo sin backend)

Rutas reales con datos de muestra:
- `POST /api/v1/auth/login` → `{ accessToken, usuario }`
- `POST /api/v1/auth/refresh` → `{ accessToken }`
- `GET /api/v1/formularios/vigente` → árbol anidado con secciones + opcionesRespuesta
- `GET /api/v1/asignaciones/mias` → lista de asignaciones
- `POST /api/v1/evaluaciones/:id/iniciar` → `{ estado: 'En_Curso' }`
- `POST /api/v1/evaluaciones/:id/respuestas` → `{ procesadas: N }`
- `POST /api/v1/evaluaciones/:id/finalizar` → `{ bloqueada: true }`
- `POST /api/v1/evidencias` → `{ id: '1', url: '/uploads/mock.jpg' }`

---

## 11. Criterios de aceptación (Fase A–F)

| Criterio | Fase |
|---|---|
| La PWA puede instalarse desde Chrome en Android | A |
| El service worker se registra sin errores en DevTools | A |
| `npm run test` pasa con 0 fallos | A–F |
| Las 9 tablas Dexie existen y tienen índices correctos | B |
| `saveSession` → `getSession` → `clearSession` funciona en test | C |
| `silentRefresh` actualiza el token en IndexedDB sin body en el request | C |
| `descargarCatalogo` aplana el árbol y guarda items + meta en Dexie | D |
| `flatten` convierte árbol anidado a lista plana sin perder nodos | D |
| `enqueue` genera UUID único; `marcarError` x10 → estado `'error'` | E |
| `SyncProcessor.calcularBackoff(20)` === 300000 | E |
| `comprimirFoto` escala a ≤800px y devuelve Blob JPEG | F |
| Foto de 1600×1200 → canvas de 800×600 en el test | F |

---

## 12. Brechas pendientes (requieren acción del equipo)

| Brecha | Impacto | Responsable |
|---|---|---|
| `GET /api/v1/formularios/vigente` no incluye factores/rangos/reglaAprobacion | `useMotorRiesgo` retorna `null`; cálculo RT en tiempo real no disponible | Int-1 |
| `captchaToken` obligatorio en login | Tests de integración necesitan bypass; en producción sin captcha no hay login | Int-1 |
| No hay endpoint de establecimientos (`RF-03`) | `AsignacionLocal` no puede mostrar categoría de alimento | Int-1 |
| `X-Ficha-Version` header no implementado | Se detecta versión desactualizada por campo `id`, no por header | Int-1 |
