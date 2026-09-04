# PWA EBR — Plan de Implementación (Integrante 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la infraestructura completa de la PWA EBR: monorepo, service worker, IndexedDB (Dexie), cola de sincronización offline, motor de riesgo en cliente, y compresión de fotos.

**Architecture:** `vite-plugin-pwa` en modo InjectManifest da control total sobre `sw.ts` en TypeScript. Dexie.js maneja 9 tablas tipadas en IndexedDB. Un `SyncProcessor` envía las respuestas capturadas offline en tres pasos: iniciar → respuestas → finalizar. El motor de riesgo se importa de `@ebr/risk-engine` pero retorna `null` hasta que el backend exponga factores/rangos.

**Tech Stack:** Vite 5, React 18, TypeScript 5, MUI v6, vite-plugin-pwa 0.21, Workbox 7, Dexie.js 4, TanStack Query v5, Zustand 5, MSW 2, Vitest 2, fake-indexeddb 6.

**Base URL del backend:** `http://localhost:3000` (dev). Todos los endpoints tienen prefijo `/api/v1/`.

---

## Mapa de archivos

```
ebr-bpm/
├── package.json                               NUEVO — workspace root
├── packages/risk-engine/                      EXISTE — solo npm run build
└── apps/web/
    ├── package.json                           NUEVO
    ├── tsconfig.json                          NUEVO
    ├── tsconfig.app.json                      NUEVO
    ├── tsconfig.node.json                     NUEVO
    ├── vite.config.ts                         NUEVO
    ├── vitest.config.ts                       NUEVO
    ├── index.html                             NUEVO
    ├── public/
    │   ├── icon.svg                           NUEVO
    │   ├── icon-192.png                       GENERADO
    │   ├── icon-512.png                       GENERADO
    │   └── mockServiceWorker.js               GENERADO por MSW
    └── src/
        ├── sw.ts                              NUEVO
        ├── main.tsx                           NUEVO
        ├── App.tsx                            NUEVO
        ├── test/setup.ts                      NUEVO
        ├── mocks/
        │   ├── handlers.ts                    NUEVO — URLs reales /api/v1/
        │   ├── node.ts                        NUEVO
        │   └── browser.ts                     NUEVO
        └── lib/
            ├── types.ts                       NUEVO
            ├── db/
            │   ├── schema.ts                  NUEVO
            │   ├── index.ts                   NUEVO
            │   └── schema.test.ts             NUEVO
            ├── auth/
            │   ├── session.ts                 NUEVO
            │   ├── session.test.ts            NUEVO
            │   ├── refresh.ts                 NUEVO
            │   └── refresh.test.ts            NUEVO
            ├── catalogo/
            │   ├── flatten.ts                 NUEVO
            │   ├── flatten.test.ts            NUEVO
            │   ├── loader.ts                  NUEVO
            │   └── loader.test.ts             NUEVO
            ├── motor/
            │   ├── useMotorRiesgo.ts          NUEVO
            │   └── useMotorRiesgo.test.ts     NUEVO
            ├── fotos/
            │   ├── compressor.ts              NUEVO
            │   └── compressor.test.ts         NUEVO
            └── sync/
                ├── queue.ts                   NUEVO
                ├── queue.test.ts              NUEVO
                ├── processor.ts               NUEVO
                ├── processor.test.ts          NUEVO
                ├── useSyncStatus.ts           NUEVO
                └── useSyncStatus.test.ts      NUEVO
```

---

## Task 1: Monorepo root + build del motor de riesgo

**Files:**
- Create: `ebr-bpm/package.json`

- [ ] **Paso 1: Crear package.json raíz**

```json
{
  "name": "ebr-bpm",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "build:engine": "npm run build -w packages/risk-engine",
    "dev": "npm run dev -w apps/web",
    "test": "npm run test --workspaces --if-present"
  }
}
```

- [ ] **Paso 2: Instalar y compilar risk-engine**

```bash
cd /c/Users/anpro/ebr-bpm
npm install -w packages/risk-engine
npm run build:engine
```

Resultado esperado: aparece `packages/risk-engine/dist/` con `index.js` e `index.d.ts`.

- [ ] **Paso 3: Verificar dist/**

```bash
ls packages/risk-engine/dist/
```

Resultado esperado: `index.d.ts  index.js`

- [ ] **Paso 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(monorepo): configurar npm workspaces y compilar @ebr/risk-engine"
```

---

## Task 2: Scaffold de apps/web

**Files:**
- Create: `apps/web/package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`

- [ ] **Paso 1: Crear apps/web/package.json**

```json
{
  "name": "@ebr/web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ebr/risk-engine": "*",
    "@emotion/react": "^11.13.3",
    "@emotion/styled": "^11.13.0",
    "@mui/icons-material": "^6.1.3",
    "@mui/material": "^6.1.3",
    "@tanstack/react-query": "^5.59.0",
    "dexie": "^4.0.8",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "workbox-precaching": "^7.1.0",
    "workbox-routing": "^7.1.0",
    "workbox-strategies": "^7.1.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.2",
    "@vite-pwa/assets-generator": "^0.2.6",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.1",
    "msw": "^2.4.11",
    "typescript": "^5.6.3",
    "vite": "^5.4.9",
    "vite-plugin-pwa": "^0.21.0",
    "vitest": "^2.1.2"
  }
}
```

- [ ] **Paso 2: Crear apps/web/tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Paso 3: Crear apps/web/tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Paso 4: Crear apps/web/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Paso 5: Crear apps/web/index.html**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1565C0" />
    <title>EBR — Evaluación Basada en Riesgo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Paso 6: Instalar dependencias desde la raíz**

```bash
cd /c/Users/anpro/ebr-bpm
npm install
```

- [ ] **Paso 7: Verificar symlink del motor**

```bash
ls /c/Users/anpro/ebr-bpm/node_modules/@ebr/
```

Resultado esperado: `risk-engine  web`

- [ ] **Paso 8: Commit**

```bash
git add apps/web/package.json apps/web/tsconfig.json apps/web/tsconfig.app.json apps/web/tsconfig.node.json apps/web/index.html package-lock.json
git commit -m "chore(web): scaffold apps/web con dependencias y tsconfig"
```

---

## Task 3: Infraestructura de tests + MSW

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/mocks/handlers.ts`
- Create: `apps/web/src/mocks/node.ts`
- Create: `apps/web/src/mocks/browser.ts`

- [ ] **Paso 1: Crear apps/web/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
```

- [ ] **Paso 2: Crear apps/web/src/test/setup.ts**

```typescript
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from '@/mocks/node';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Paso 3: Crear apps/web/src/mocks/handlers.ts**

CRÍTICO: las rutas usan `/api/v1/` (no `/api/`). El shape de usuario tiene `rol` singular, no `roles[]`. El refresh devuelve solo `accessToken`. El árbol del catálogo usa `secciones` y `opcionesRespuesta`.

```typescript
import { http, HttpResponse } from 'msw';

export const MOCK_ACCESS_TOKEN = 'mock-access-token-abc123';

export const MOCK_LOGIN_RESPONSE = {
  accessToken: MOCK_ACCESS_TOKEN,
  usuario: {
    id: '1',
    nombreCompleto: 'Ana Pérez',
    rol: 'TECNICO_EVALUADOR',
    empresaId: null,
  },
};

export const MOCK_CATALOGO = {
  id: '1',
  secciones: [
    {
      id: '1', idPadre: null, numeracion: '1', titulo: 'Sección A',
      nivel: 1, orden: 1, esEvaluable: false, peso: 0, idCriticidad: null,
      hijos: [
        {
          id: '2', idPadre: '1', numeracion: '1.1', titulo: 'Ítem evaluable',
          nivel: 2, orden: 1, esEvaluable: true, peso: 1.0, idCriticidad: '1',
          hijos: [],
        },
      ],
    },
  ],
  opcionesRespuesta: [
    { id: '1', codigo: 'C',   nombre: 'Cumple',               valor: 1.0, excluyeDelCalculo: false, generaNc: false },
    { id: '2', codigo: 'CP',  nombre: 'Cumplimiento parcial',  valor: 0.5, excluyeDelCalculo: false, generaNc: true  },
    { id: '3', codigo: 'IT',  nombre: 'Incumple totalmente',   valor: 0.0, excluyeDelCalculo: false, generaNc: true  },
    { id: '4', codigo: 'N/A', nombre: 'No aplica',             valor: 0.0, excluyeDelCalculo: true,  generaNc: false },
  ],
};

const BASE = 'http://localhost:3000';

export const handlers = [
  http.post(`${BASE}/api/v1/auth/login`, () =>
    HttpResponse.json(MOCK_LOGIN_RESPONSE)
  ),
  http.post(`${BASE}/api/v1/auth/refresh`, () =>
    HttpResponse.json({ accessToken: MOCK_ACCESS_TOKEN })
  ),
  http.post(`${BASE}/api/v1/auth/logout`, () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.get(`${BASE}/api/v1/formularios/vigente`, () =>
    HttpResponse.json(MOCK_CATALOGO)
  ),
  http.get(`${BASE}/api/v1/asignaciones/mias`, () =>
    HttpResponse.json([])
  ),
  http.post(`${BASE}/api/v1/evaluaciones/:id/iniciar`, () =>
    HttpResponse.json({ estado: 'En_Curso' })
  ),
  http.post(`${BASE}/api/v1/evaluaciones/:id/respuestas`, () =>
    HttpResponse.json({ procesadas: 1 })
  ),
  http.post(`${BASE}/api/v1/evaluaciones/:id/finalizar`, () =>
    HttpResponse.json({ bloqueada: true })
  ),
  http.post(`${BASE}/api/v1/evidencias`, () =>
    HttpResponse.json({ id: '1', url: '/uploads/mock.jpg' })
  ),
];
```

- [ ] **Paso 4: Crear apps/web/src/mocks/node.ts**

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

- [ ] **Paso 5: Crear apps/web/src/mocks/browser.ts**

```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

- [ ] **Paso 6: Verificar que vitest arranca sin errores**

```bash
cd /c/Users/anpro/ebr-bpm
npm run test -w apps/web 2>&1 | head -20
```

Resultado esperado: `No test files found` (sin errores de configuración).

- [ ] **Paso 7: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/src/test/ apps/web/src/mocks/
git commit -m "test(web): configurar Vitest + fake-indexeddb + MSW con rutas /api/v1/"
```

---

## Task 4: PWA foundation (service worker + manifest + iconos)

**Files:**
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/sw.ts`
- Create: `apps/web/public/icon.svg`
- Create: `apps/web/src/main.tsx` (mínimo temporal)

- [ ] **Paso 1: Crear apps/web/public/icon.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="24" fill="#1565C0"/>
  <text x="96" y="120" font-family="Arial,sans-serif" font-weight="bold"
        font-size="72" text-anchor="middle" fill="white">EBR</text>
</svg>
```

- [ ] **Paso 2: Generar iconos PNG**

```bash
cd /c/Users/anpro/ebr-bpm/apps/web
npx @vite-pwa/assets-generator --preset minimal public/icon.svg
```

Si falla, crear placeholders:
```bash
node -e "
const fs = require('fs');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('public/icon-192.png', png);
fs.writeFileSync('public/icon-512.png', png);
"
```

- [ ] **Paso 3: Crear apps/web/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectManifest: {
        swSrc: 'src/sw.ts',
        swDest: 'dist/sw.js',
        globDirectory: 'dist',
      },
      manifest: {
        name: 'EBR — Evaluación Basada en Riesgo',
        short_name: 'EBR',
        description: 'Sistema de inspección BPM para DIGEMAPS',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1565C0',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
```

- [ ] **Paso 4: Crear apps/web/src/sw.ts**

```typescript
/// <reference lib="WebWorker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Catálogo y asignaciones: NetworkFirst con caché de respaldo
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/formularios') || url.pathname.startsWith('/api/v1/asignaciones'),
  new NetworkFirst({ cacheName: 'api-catalogo', networkTimeoutSeconds: 3 })
);

// Tokens: nunca cachear
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/auth'),
  new NetworkOnly()
);

// Evaluaciones y evidencias: escrituras offline van por la cola, no el SW
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/evaluaciones') || url.pathname.startsWith('/api/v1/evidencias'),
  new NetworkOnly()
);

// Resto de GET: StaleWhileRevalidate
registerRoute(
  ({ request }) => request.method === 'GET',
  new StaleWhileRevalidate({ cacheName: 'api-general' })
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
```

- [ ] **Paso 5: Crear apps/web/src/main.tsx mínimo**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div>EBR — arrancando</div>
  </React.StrictMode>
);
```

- [ ] **Paso 6: Verificar que el dev server arranca**

```bash
cd /c/Users/anpro/ebr-bpm
timeout 15 npm run dev 2>&1 | head -15
```

Resultado esperado: `VITE v5.x.x  ready in xxx ms` y `Local: http://localhost:5173/`

- [ ] **Paso 7: Commit**

```bash
git add apps/web/vite.config.ts apps/web/src/sw.ts apps/web/src/main.tsx apps/web/public/
git commit -m "feat(web): PWA base — service worker InjectManifest + manifest + iconos"
```

---

## Task 5: Tipos locales + Esquema Dexie (9 tablas)

**Files:**
- Create: `apps/web/src/lib/types.ts`
- Create: `apps/web/src/lib/db/schema.ts`
- Create: `apps/web/src/lib/db/index.ts`
- Create: `apps/web/src/lib/db/schema.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// apps/web/src/lib/db/schema.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from './index';

beforeEach(async () => { await db.open(); });
afterEach(async () => { await db.delete(); });

describe('EbrDatabase schema', () => {
  it('tiene las 9 tablas esperadas', () => {
    const tablas = db.tables.map(t => t.name).sort();
    expect(tablas).toEqual([
      'asignacion', 'catalogo_item', 'catalogo_meta',
      'cola_sync', 'evaluacion', 'evidencia', 'respuesta', 'sesion',
    ].sort());
  });

  it('puede escribir y leer de sesion', async () => {
    await db.sesion.put({
      id: 1,
      accessToken: 'tok',
      expiresAt: Date.now() + 900_000,
      usuario: { id: '1', nombreCompleto: 'Ana', rol: 'TECNICO_EVALUADOR', empresaId: null },
    });
    const s = await db.sesion.get(1);
    expect(s?.accessToken).toBe('tok');
  });

  it('puede escribir y leer de cola_sync', async () => {
    const uuid = crypto.randomUUID();
    await db.cola_sync.add({
      uuidLocal: uuid,
      tipo: 'RESPUESTAS',
      payload: { evaluacionId: '42' },
      timestamp: Date.now(),
      intentos: 0,
      estado: 'pendiente',
    });
    const op = await db.cola_sync.get(uuid);
    expect(op?.estado).toBe('pendiente');
  });
});
```

- [ ] **Paso 2: Ejecutar el test y confirmar que falla**

```bash
npm run test -w apps/web -- src/lib/db/schema.test.ts
```

Resultado esperado: `FAIL` — `Cannot find module './index'`

- [ ] **Paso 3: Crear apps/web/src/lib/types.ts**

```typescript
export interface UsuarioLocal {
  id: string;
  nombreCompleto: string;
  rol: string;
  empresaId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  usuario: UsuarioLocal;
}

export interface NodoCatalogo {
  id: string;
  idPadre: string | null;
  numeracion: string;
  titulo: string;
  nivel: number;
  orden: number;
  esEvaluable: boolean;
  peso: number;
  idCriticidad: string | null;
  hijos: NodoCatalogo[];
}

export interface OpcionRespuestaLocal {
  id: string;
  codigo: string;
  nombre: string;
  valor: number;
  excluyeDelCalculo: boolean;
  generaNc: boolean;
}

export interface FormularioVigenteResponse {
  id: string;
  secciones: NodoCatalogo[];
  opcionesRespuesta: OpcionRespuestaLocal[];
}
```

- [ ] **Paso 4: Crear apps/web/src/lib/db/schema.ts**

```typescript
import Dexie, { type EntityTable } from 'dexie';
import type { UsuarioLocal, OpcionRespuestaLocal } from '@/lib/types';

export interface SesionLocal {
  id: 1;
  accessToken: string;
  expiresAt: number;
  usuario: UsuarioLocal;
}

export interface CatalogoItemLocal {
  id: string;
  versionFichaId: string;
  idPadre: string | null;
  numeracion: string;
  titulo: string;
  nivel: number;
  orden: number;
  esEvaluable: boolean;
  peso: number;
  idCriticidad: string | null;
}

export interface CatalogoMetaLocal {
  id: 1;
  versionFichaId: string;
  descargadoEn: number;
  opcionesRespuesta: OpcionRespuestaLocal[];
}

export interface EvaluacionLocal {
  uuidLocal: string;
  evaluacionServerId: string;
  estado: 'borrador' | 'en_progreso' | 'finalizada' | 'sincronizada' | 'error';
  creadaEn: number;
  modificadaEn: number;
}

export interface RespuestaLocal {
  uuidLocal: string;
  evaluacionUuid: string;
  itemId: string;
  codigoOpcion: 'C' | 'CP' | 'IT' | 'N/A';
  nivelCriticidad: 'C' | 'M' | 'Me' | null;
  observacion: string;
  capturaEn: number;
}

export interface EvidenciaLocal {
  uuidLocal: string;
  evaluacionUuid: string;
  itemId: string | null;
  blob: Blob;
  nombreArchivo: string;
  comentario: string;
  capturaEn: number;
  subida: boolean;
}

export interface OperacionPendiente {
  uuidLocal: string;
  tipo: 'INICIAR_EVALUACION' | 'RESPUESTAS' | 'EVIDENCIA' | 'FINALIZAR_EVALUACION';
  payload: object;
  timestamp: number;
  intentos: number;
  estado: 'pendiente' | 'enviando' | 'error' | 'enviado';
  errorMsg?: string;
}

export interface AsignacionLocal {
  id: string;
  casoId: string;
  idEvaluador: string;
  estado: string;
  fechaAsignacion: string;
  establecimientoNombre: string;
  establecimientoCalle: string;
  sincronizadoEn: number;
}

export class EbrDatabase extends Dexie {
  sesion!: EntityTable<SesionLocal, 'id'>;
  catalogo_item!: EntityTable<CatalogoItemLocal, 'id'>;
  catalogo_meta!: EntityTable<CatalogoMetaLocal, 'id'>;
  evaluacion!: EntityTable<EvaluacionLocal, 'uuidLocal'>;
  respuesta!: EntityTable<RespuestaLocal, 'uuidLocal'>;
  evidencia!: EntityTable<EvidenciaLocal, 'uuidLocal'>;
  cola_sync!: EntityTable<OperacionPendiente, 'uuidLocal'>;
  asignacion!: EntityTable<AsignacionLocal, 'id'>;

  constructor() {
    super('ebr');
    this.version(1).stores({
      sesion:         'id',
      catalogo_item:  'id, versionFichaId, idPadre',
      catalogo_meta:  'id',
      evaluacion:     'uuidLocal, evaluacionServerId, estado',
      respuesta:      'uuidLocal, evaluacionUuid, itemId',
      evidencia:      'uuidLocal, evaluacionUuid, subida',
      cola_sync:      'uuidLocal, tipo, estado, timestamp',
      asignacion:     'id, estado',
    });
  }
}
```

- [ ] **Paso 5: Crear apps/web/src/lib/db/index.ts**

```typescript
import { EbrDatabase } from './schema';

export const db = new EbrDatabase();
export * from './schema';
```

- [ ] **Paso 6: Ejecutar el test y confirmar que pasa**

```bash
npm run test -w apps/web -- src/lib/db/schema.test.ts
```

Resultado esperado: 3 tests en verde.

- [ ] **Paso 7: Commit**

```bash
git add apps/web/src/lib/types.ts apps/web/src/lib/db/
git commit -m "feat(web/db): esquema Dexie con 8 tablas tipadas + tipos locales (usuario.rol singular)"
```

---

## Task 6: Auth — session.ts

**Files:**
- Create: `apps/web/src/lib/auth/session.ts`
- Create: `apps/web/src/lib/auth/session.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// apps/web/src/lib/auth/session.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { saveSession, getSession, clearSession, isTokenValid } from './session';
import type { LoginResponse } from '@/lib/types';

const LOGIN: LoginResponse = {
  accessToken: 'acc',
  usuario: { id: '1', nombreCompleto: 'Ana', rol: 'TECNICO_EVALUADOR', empresaId: null },
};

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('session', () => {
  it('saveSession guarda el token con expiresAt correcto', async () => {
    const antes = Date.now();
    await saveSession(LOGIN);
    const s = await db.sesion.get(1);
    expect(s?.accessToken).toBe('acc');
    expect(s?.expiresAt).toBeGreaterThanOrEqual(antes + 900_000 - 100);
  });

  it('getSession devuelve null si no hay sesion', async () => {
    expect(await getSession()).toBeNull();
  });

  it('getSession devuelve la sesion guardada', async () => {
    await saveSession(LOGIN);
    const s = await getSession();
    expect(s?.usuario.rol).toBe('TECNICO_EVALUADOR');
  });

  it('clearSession elimina el registro', async () => {
    await saveSession(LOGIN);
    await clearSession();
    expect(await getSession()).toBeNull();
  });

  it('isTokenValid devuelve true si no ha expirado', async () => {
    await saveSession(LOGIN);
    expect(await isTokenValid()).toBe(true);
  });

  it('isTokenValid devuelve false si expiresAt pasó', async () => {
    await db.sesion.put({
      id: 1, accessToken: 'tok', expiresAt: Date.now() - 1000,
      usuario: { id: '1', nombreCompleto: 'Ana', rol: 'TECNICO_EVALUADOR', empresaId: null },
    });
    expect(await isTokenValid()).toBe(false);
  });
});
```

- [ ] **Paso 2: Ejecutar el test y confirmar que falla**

```bash
npm run test -w apps/web -- src/lib/auth/session.test.ts
```

- [ ] **Paso 3: Crear apps/web/src/lib/auth/session.ts**

```typescript
import { db } from '@/lib/db';
import type { LoginResponse } from '@/lib/types';

const TOKEN_MARGIN_MS = 30_000;
const ACCESS_TOKEN_TTL_MS = 900_000; // 15 min

export async function saveSession(data: LoginResponse): Promise<void> {
  await db.sesion.put({
    id: 1,
    accessToken: data.accessToken,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
    usuario: data.usuario,
  });
}

export async function getSession() {
  return (await db.sesion.get(1)) ?? null;
}

export async function clearSession(): Promise<void> {
  await db.sesion.delete(1);
}

export async function isTokenValid(): Promise<boolean> {
  const s = await getSession();
  if (!s) return false;
  return s.expiresAt > Date.now() + TOKEN_MARGIN_MS;
}
```

- [ ] **Paso 4: Ejecutar el test y confirmar que pasa**

```bash
npm run test -w apps/web -- src/lib/auth/session.test.ts
```

Resultado esperado: 6 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/lib/auth/session.ts apps/web/src/lib/auth/session.test.ts
git commit -m "feat(web/auth): saveSession/getSession/clearSession/isTokenValid con Dexie"
```

---

## Task 7: Auth — refresh.ts

**Files:**
- Create: `apps/web/src/lib/auth/refresh.ts`
- Create: `apps/web/src/lib/auth/refresh.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// apps/web/src/lib/auth/refresh.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { saveSession, getSession } from './session';
import { silentRefresh } from './refresh';
import { MOCK_LOGIN_RESPONSE, MOCK_ACCESS_TOKEN } from '@/mocks/handlers';

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('silentRefresh', () => {
  it('devuelve false si no hay sesion guardada', async () => {
    expect(await silentRefresh()).toBe(false);
  });

  it('llama a /api/v1/auth/refresh sin body y actualiza el token', async () => {
    await saveSession(MOCK_LOGIN_RESPONSE);
    const resultado = await silentRefresh();
    expect(resultado).toBe(true);
    const s = await getSession();
    expect(s?.accessToken).toBe(MOCK_ACCESS_TOKEN);
  });

  it('devuelve false si el servidor responde 401', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/refresh', () =>
        HttpResponse.json({ message: 'Sesión inválida.' }, { status: 401 })
      )
    );
    await saveSession(MOCK_LOGIN_RESPONSE);
    expect(await silentRefresh()).toBe(false);
  });
});
```

- [ ] **Paso 2: Ejecutar el test y confirmar que falla**

```bash
npm run test -w apps/web -- src/lib/auth/refresh.test.ts
```

- [ ] **Paso 3: Crear apps/web/src/lib/auth/refresh.ts**

```typescript
import { getSession, saveSession } from './session';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function silentRefresh(): Promise<boolean> {
  const sesion = await getSession();
  if (!sesion) return false;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',  // envía la cookie httpOnly automáticamente
    });
    if (!res.ok) return false;
    const data = await res.json() as { accessToken: string };
    await saveSession({ accessToken: data.accessToken, usuario: sesion.usuario });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Paso 4: Ejecutar el test y confirmar que pasa**

```bash
npm run test -w apps/web -- src/lib/auth/refresh.test.ts
```

Resultado esperado: 3 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/lib/auth/refresh.ts apps/web/src/lib/auth/refresh.test.ts
git commit -m "feat(web/auth): silentRefresh usa cookie automática (credentials: include)"
```

---

## Task 8: Catálogo — flatten.ts

**Files:**
- Create: `apps/web/src/lib/catalogo/flatten.ts`
- Create: `apps/web/src/lib/catalogo/flatten.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// apps/web/src/lib/catalogo/flatten.test.ts
import { describe, it, expect } from 'vitest';
import { flattenSecciones } from './flatten';
import type { NodoCatalogo } from '@/lib/types';

const arbol: NodoCatalogo[] = [
  {
    id: '1', idPadre: null, numeracion: '1', titulo: 'Sección', nivel: 1, orden: 1,
    esEvaluable: false, peso: 0, idCriticidad: null,
    hijos: [
      {
        id: '2', idPadre: '1', numeracion: '1.1', titulo: 'Subsección', nivel: 2, orden: 1,
        esEvaluable: false, peso: 0, idCriticidad: null,
        hijos: [
          {
            id: '3', idPadre: '2', numeracion: '1.1.1', titulo: 'Criterio', nivel: 3, orden: 1,
            esEvaluable: true, peso: 1.0, idCriticidad: '1',
            hijos: [],
          },
        ],
      },
    ],
  },
];

describe('flattenSecciones', () => {
  it('devuelve lista plana con todos los nodos', () => {
    const plana = flattenSecciones(arbol, '1');
    expect(plana).toHaveLength(3);
  });

  it('asigna versionFichaId a cada item', () => {
    const plana = flattenSecciones(arbol, '1');
    expect(plana.every(i => i.versionFichaId === '1')).toBe(true);
  });

  it('preserva idPadre correctamente', () => {
    const plana = flattenSecciones(arbol, '1');
    const sub = plana.find(i => i.id === '2');
    expect(sub?.idPadre).toBe('1');
  });

  it('lista vacía devuelve array vacío', () => {
    expect(flattenSecciones([], '1')).toEqual([]);
  });
});
```

- [ ] **Paso 2: Ejecutar el test y confirmar que falla**

```bash
npm run test -w apps/web -- src/lib/catalogo/flatten.test.ts
```

- [ ] **Paso 3: Crear apps/web/src/lib/catalogo/flatten.ts**

```typescript
import type { NodoCatalogo } from '@/lib/types';
import type { CatalogoItemLocal } from '@/lib/db';

export function flattenSecciones(nodos: NodoCatalogo[], versionFichaId: string): CatalogoItemLocal[] {
  return nodos.flatMap(({ hijos, ...nodo }) => [
    { ...nodo, versionFichaId },
    ...flattenSecciones(hijos, versionFichaId),
  ]);
}
```

- [ ] **Paso 4: Ejecutar el test y confirmar que pasa**

```bash
npm run test -w apps/web -- src/lib/catalogo/flatten.test.ts
```

Resultado esperado: 4 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/lib/catalogo/flatten.ts apps/web/src/lib/catalogo/flatten.test.ts
git commit -m "feat(web/catalogo): flattenSecciones convierte árbol anidado a lista plana para Dexie"
```

---

## Task 9: Catálogo — loader.ts

**Files:**
- Create: `apps/web/src/lib/catalogo/loader.ts`
- Create: `apps/web/src/lib/catalogo/loader.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// apps/web/src/lib/catalogo/loader.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { descargarCatalogo, necesitaActualizar } from './loader';

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('descargarCatalogo', () => {
  it('guarda items aplanados y meta en Dexie', async () => {
    await descargarCatalogo();

    const items = await db.catalogo_item.toArray();
    expect(items.length).toBeGreaterThan(0);
    // El mock tiene secciones anidadas → deben aplanarse (raíz + hijo = 2)
    expect(items).toHaveLength(2);

    const meta = await db.catalogo_meta.get(1);
    expect(meta?.versionFichaId).toBe('1');
    expect(meta?.opcionesRespuesta).toHaveLength(4);
  });

  it('los items tienen versionFichaId asignado', async () => {
    await descargarCatalogo();
    const items = await db.catalogo_item.toArray();
    expect(items.every(i => i.versionFichaId === '1')).toBe(true);
  });
});

describe('necesitaActualizar', () => {
  it('devuelve true si no hay catalogo descargado', async () => {
    expect(await necesitaActualizar('1')).toBe(true);
  });

  it('devuelve false si la version coincide', async () => {
    await descargarCatalogo();
    expect(await necesitaActualizar('1')).toBe(false);
  });

  it('devuelve true si la version cambió', async () => {
    await descargarCatalogo();
    expect(await necesitaActualizar('99')).toBe(true);
  });
});
```

- [ ] **Paso 2: Ejecutar el test y confirmar que falla**

```bash
npm run test -w apps/web -- src/lib/catalogo/loader.test.ts
```

- [ ] **Paso 3: Crear apps/web/src/lib/catalogo/loader.ts**

```typescript
import { db } from '@/lib/db';
import { flattenSecciones } from './flatten';
import type { FormularioVigenteResponse } from '@/lib/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function descargarCatalogo(): Promise<void> {
  const sesion = await db.sesion.get(1);
  const headers: Record<string, string> = {};
  if (sesion) headers['Authorization'] = `Bearer ${sesion.accessToken}`;

  const res = await fetch(`${API_BASE}/api/v1/formularios/vigente`, { headers });
  if (!res.ok) throw new Error(`Error al descargar catálogo: ${res.status}`);

  const data: FormularioVigenteResponse = await res.json();

  const itemsPlanos = flattenSecciones(data.secciones, data.id);

  await db.transaction('rw', [db.catalogo_item, db.catalogo_meta], async () => {
    await db.catalogo_item.clear();
    await db.catalogo_item.bulkPut(itemsPlanos);

    await db.catalogo_meta.put({
      id: 1,
      versionFichaId: data.id,
      descargadoEn: Date.now(),
      opcionesRespuesta: data.opcionesRespuesta,
    });
  });
}

export async function necesitaActualizar(versionServidor: string): Promise<boolean> {
  const meta = await db.catalogo_meta.get(1);
  if (!meta) return true;
  return meta.versionFichaId !== versionServidor;
}
```

- [ ] **Paso 4: Ejecutar el test y confirmar que pasa**

```bash
npm run test -w apps/web -- src/lib/catalogo/loader.test.ts
```

Resultado esperado: 5 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/lib/catalogo/loader.ts apps/web/src/lib/catalogo/loader.test.ts
git commit -m "feat(web/catalogo): descargarCatalogo aplana secciones y guarda meta en Dexie"
```

---

## Task 10: Motor de riesgo — useMotorRiesgo.ts

**Files:**
- Create: `apps/web/src/lib/motor/useMotorRiesgo.ts`
- Create: `apps/web/src/lib/motor/useMotorRiesgo.test.ts`

**Nota:** El hook retorna `null` porque el backend no expone todavía los factores/rangos necesarios para el cálculo offline. El esqueleto está listo para cuando ese endpoint exista.

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// apps/web/src/lib/motor/useMotorRiesgo.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMotorRiesgo } from './useMotorRiesgo';
import type { RespuestaLocal, CatalogoMetaLocal } from '@/lib/db';

const META: CatalogoMetaLocal = {
  id: 1,
  versionFichaId: '1',
  descargadoEn: Date.now(),
  opcionesRespuesta: [
    { id: '1', codigo: 'C', nombre: 'Cumple', valor: 1.0, excluyeDelCalculo: false, generaNc: false },
  ],
};

const RESPUESTAS: RespuestaLocal[] = [
  {
    uuidLocal: crypto.randomUUID(),
    evaluacionUuid: 'eval-1',
    itemId: '2',
    codigoOpcion: 'C',
    nivelCriticidad: null,
    observacion: '',
    capturaEn: Date.now(),
  },
];

describe('useMotorRiesgo', () => {
  it('retorna null cuando no hay respuestas', () => {
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas: [], catalogoMeta: META })
    );
    expect(result.current).toBeNull();
  });

  it('retorna null cuando catalogoMeta es null', () => {
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas: RESPUESTAS, catalogoMeta: null })
    );
    expect(result.current).toBeNull();
  });

  it('retorna null hasta que haya datos de factores (brecha de backend)', () => {
    // El catálogo actual no tiene factores/rangos → el hook devuelve null
    const { result } = renderHook(() =>
      useMotorRiesgo({ respuestas: RESPUESTAS, catalogoMeta: META })
    );
    expect(result.current).toBeNull();
  });
});
```

- [ ] **Paso 2: Ejecutar el test y confirmar que falla**

```bash
npm run test -w apps/web -- src/lib/motor/useMotorRiesgo.test.ts
```

- [ ] **Paso 3: Crear apps/web/src/lib/motor/useMotorRiesgo.ts**

```typescript
import { useMemo } from 'react';
import type { ResultadoRiesgo } from '@ebr/risk-engine';
import type { CatalogoMetaLocal, RespuestaLocal } from '@/lib/db';

interface Params {
  respuestas: RespuestaLocal[];
  catalogoMeta: CatalogoMetaLocal | null;
}

/**
 * Calcula el resultado de riesgo en tiempo real.
 * Retorna null hasta que el backend exponga factores/rangos/reglaAprobacion
 * en GET /api/v1/formularios/vigente (brecha conocida).
 */
export function useMotorRiesgo({ respuestas, catalogoMeta }: Params): ResultadoRiesgo | null {
  return useMemo(() => {
    if (respuestas.length === 0) return null;
    if (!catalogoMeta) return null;
    // TODO: implementar cuando el backend exponga factores, rangos y reglaAprobacion
    return null;
  }, [respuestas.length, catalogoMeta]);
}
```

- [ ] **Paso 4: Ejecutar el test y confirmar que pasa**

```bash
npm run test -w apps/web -- src/lib/motor/useMotorRiesgo.test.ts
```

Resultado esperado: 3 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/lib/motor/
git commit -m "feat(web/motor): useMotorRiesgo stub — retorna null hasta endpoint de factores/rangos"
```

---

## Task 11: Fotos — compressor.ts

**Files:**
- Create: `apps/web/src/lib/fotos/compressor.ts`
- Create: `apps/web/src/lib/fotos/compressor.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// apps/web/src/lib/fotos/compressor.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { comprimirFoto } from './compressor';

beforeAll(() => {
  (globalThis as any).Image = class {
    onload: (() => void) | null = null;
    width = 1600; height = 1200;
    set src(_: string) { Promise.resolve().then(() => this.onload?.()); }
  };
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
  globalThis.URL.revokeObjectURL = vi.fn();
  (globalThis as any).OffscreenCanvas = class {
    width: number; height: number;
    constructor(w: number, h: number) { this.width = w; this.height = h; }
    getContext() { return { drawImage: vi.fn() }; }
    convertToBlob() { return Promise.resolve(new Blob(['img'], { type: 'image/jpeg' })); }
  };
});

describe('comprimirFoto', () => {
  it('devuelve un Blob de tipo image/jpeg', async () => {
    const file = new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' });
    const blob = await comprimirFoto(file);
    expect(blob.type).toBe('image/jpeg');
  });

  it('escala la imagen 1600x1200 a 800x600', async () => {
    let capturedCanvas: any;
    (globalThis as any).OffscreenCanvas = class {
      width: number; height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; capturedCanvas = this; }
      getContext() { return { drawImage: vi.fn() }; }
      convertToBlob() { return Promise.resolve(new Blob(['img'], { type: 'image/jpeg' })); }
    };
    await comprimirFoto(new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' }));
    expect(capturedCanvas.width).toBe(800);
    expect(capturedCanvas.height).toBe(600);
  });

  it('no escala si la imagen ya es ≤ 800px', async () => {
    (globalThis as any).Image = class {
      onload: (() => void) | null = null;
      width = 640; height = 480;
      set src(_: string) { Promise.resolve().then(() => this.onload?.()); }
    };
    let capturedCanvas: any;
    (globalThis as any).OffscreenCanvas = class {
      width: number; height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; capturedCanvas = this; }
      getContext() { return { drawImage: vi.fn() }; }
      convertToBlob() { return Promise.resolve(new Blob(['img'], { type: 'image/jpeg' })); }
    };
    await comprimirFoto(new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' }));
    expect(capturedCanvas.width).toBe(640);
    expect(capturedCanvas.height).toBe(480);
  });
});
```

- [ ] **Paso 2: Ejecutar el test y confirmar que falla**

```bash
npm run test -w apps/web -- src/lib/fotos/compressor.test.ts
```

- [ ] **Paso 3: Crear apps/web/src/lib/fotos/compressor.ts**

```typescript
const MAX_SIDE = 800;
const QUALITY = 0.7;
const QUALITY_SECOND_PASS = 0.5;
const MAX_BLOB_SIZE = 300_000;

function calcularDimensiones(w: number, h: number): { w: number; h: number } {
  const max = Math.max(w, h);
  if (max <= MAX_SIDE) return { w, h };
  const ratio = MAX_SIDE / max;
  return { w: Math.round(w * ratio), h: Math.round(h * ratio) };
}

async function drawAndEncode(img: HTMLImageElement, dims: { w: number; h: number }, quality: number): Promise<Blob> {
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(dims.w, dims.h)
    : Object.assign(document.createElement('canvas'), { width: dims.w, height: dims.h });

  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (!ctx) throw new Error('No se pudo obtener contexto 2D del canvas');
  ctx.drawImage(img as unknown as CanvasImageSource, 0, 0, dims.w, dims.h);

  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality });
  }
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      blob => blob ? resolve(blob) : reject(new Error('toBlob devolvió null')),
      'image/jpeg',
      quality
    );
  });
}

export async function comprimirFoto(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = objectUrl;
  });
  URL.revokeObjectURL(objectUrl);

  const dims = calcularDimensiones(img.width, img.height);
  let blob = await drawAndEncode(img, dims, QUALITY);
  if (blob.size > MAX_BLOB_SIZE) {
    blob = await drawAndEncode(img, dims, QUALITY_SECOND_PASS);
  }
  return blob;
}
```

- [ ] **Paso 4: Ejecutar el test y confirmar que pasa**

```bash
npm run test -w apps/web -- src/lib/fotos/compressor.test.ts
```

Resultado esperado: 3 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/lib/fotos/
git commit -m "feat(web/fotos): comprimirFoto — 800px JPEG 0.7, doble pasada si >300KB"
```

---

## Task 12: Sync — queue.ts

**Files:**
- Create: `apps/web/src/lib/sync/queue.ts`
- Create: `apps/web/src/lib/sync/queue.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// apps/web/src/lib/sync/queue.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { enqueue, getPendientes, marcarEnviada, marcarError } from './queue';

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('queue', () => {
  it('enqueue agrega operación con estado pendiente', async () => {
    const uuid = await enqueue('RESPUESTAS', { evaluacionId: '42' });
    const op = await db.cola_sync.get(uuid);
    expect(op?.estado).toBe('pendiente');
    expect(op?.intentos).toBe(0);
    expect(op?.tipo).toBe('RESPUESTAS');
  });

  it('enqueue genera UUID único cada vez', async () => {
    const a = await enqueue('RESPUESTAS', {});
    const b = await enqueue('RESPUESTAS', {});
    expect(a).not.toBe(b);
  });

  it('getPendientes devuelve solo ops pendiente, ordenadas por timestamp', async () => {
    const u1 = await enqueue('INICIAR_EVALUACION', {});
    const u2 = await enqueue('RESPUESTAS', {});
    const ops = await getPendientes();
    expect(ops.map(o => o.uuidLocal)).toEqual([u1, u2]);
    expect(ops.every(o => o.estado === 'pendiente')).toBe(true);
  });

  it('marcarEnviada pone estado enviado', async () => {
    const uuid = await enqueue('RESPUESTAS', {});
    await marcarEnviada(uuid);
    expect((await db.cola_sync.get(uuid))?.estado).toBe('enviado');
  });

  it('marcarError incrementa intentos y guarda mensaje', async () => {
    const uuid = await enqueue('RESPUESTAS', {});
    await marcarError(uuid, 'timeout');
    const op = await db.cola_sync.get(uuid);
    expect(op?.intentos).toBe(1);
    expect(op?.errorMsg).toBe('timeout');
    expect(op?.estado).toBe('pendiente');
  });

  it('marcarError tras 10 intentos pone estado error', async () => {
    const uuid = await enqueue('RESPUESTAS', {});
    for (let i = 0; i < 10; i++) await marcarError(uuid, 'fallo');
    expect((await db.cola_sync.get(uuid))?.estado).toBe('error');
  });
});
```

- [ ] **Paso 2: Ejecutar el test y confirmar que falla**

```bash
npm run test -w apps/web -- src/lib/sync/queue.test.ts
```

- [ ] **Paso 3: Crear apps/web/src/lib/sync/queue.ts**

```typescript
import { db, type OperacionPendiente } from '@/lib/db';

const MAX_INTENTOS = 10;

export async function enqueue(tipo: OperacionPendiente['tipo'], payload: object): Promise<string> {
  const uuidLocal = crypto.randomUUID();
  await db.cola_sync.add({
    uuidLocal, tipo, payload,
    timestamp: Date.now(),
    intentos: 0,
    estado: 'pendiente',
  });
  return uuidLocal;
}

export async function getPendientes(): Promise<OperacionPendiente[]> {
  return db.cola_sync.where('estado').equals('pendiente').sortBy('timestamp');
}

export async function marcarEnviada(uuidLocal: string): Promise<void> {
  await db.cola_sync.update(uuidLocal, { estado: 'enviado' });
}

export async function marcarError(uuidLocal: string, errorMsg: string): Promise<void> {
  const op = await db.cola_sync.get(uuidLocal);
  if (!op) return;
  const intentos = op.intentos + 1;
  await db.cola_sync.update(uuidLocal, {
    intentos,
    errorMsg,
    estado: intentos >= MAX_INTENTOS ? 'error' : 'pendiente',
  });
}
```

- [ ] **Paso 4: Ejecutar el test y confirmar que pasa**

```bash
npm run test -w apps/web -- src/lib/sync/queue.test.ts
```

Resultado esperado: 6 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/lib/sync/queue.ts apps/web/src/lib/sync/queue.test.ts
git commit -m "feat(web/sync): cola offline con enqueue/marcarEnviada/marcarError"
```

---

## Task 13: Sync — processor.ts

**Files:**
- Create: `apps/web/src/lib/sync/processor.ts`
- Create: `apps/web/src/lib/sync/processor.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// apps/web/src/lib/sync/processor.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { enqueue } from './queue';
import { SyncProcessor } from './processor';

beforeEach(async () => {
  await db.open();
  await db.sesion.put({
    id: 1, accessToken: 'tok', expiresAt: Date.now() + 900_000,
    usuario: { id: '1', nombreCompleto: 'Ana', rol: 'TECNICO_EVALUADOR', empresaId: null },
  });
});
afterEach(() => db.delete());

describe('SyncProcessor', () => {
  it('calcularBackoff es exponencial con máximo 300 000 ms', () => {
    const proc = new SyncProcessor();
    expect(proc.calcularBackoff(0)).toBe(1_000);
    expect(proc.calcularBackoff(3)).toBe(8_000);
    expect(proc.calcularBackoff(20)).toBe(300_000);
  });

  it('envía respuestas y las marca como enviadas', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/iniciar', () =>
        HttpResponse.json({ estado: 'En_Curso' })
      ),
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () =>
        HttpResponse.json({ procesadas: 1 })
      ),
    );

    await enqueue('INICIAR_EVALUACION', { evaluacionServerId: '42' });
    const uuid = await enqueue('RESPUESTAS', {
      evaluacionServerId: '42',
      respuestas: [{ itemId: '1', codigoOpcion: 'C' }],
    });

    const proc = new SyncProcessor();
    await proc.procesarCola();

    expect((await db.cola_sync.get(uuid))?.estado).toBe('enviado');
  });

  it('marca como error tras 10 intentos fallidos', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/evaluaciones/:id/respuestas', () =>
        HttpResponse.json({ message: 'Error' }, { status: 500 })
      )
    );
    const uuid = await enqueue('RESPUESTAS', { evaluacionServerId: '99', respuestas: [] });
    await db.cola_sync.update(uuid, { intentos: 9 });

    const proc = new SyncProcessor();
    await proc.procesarCola();

    expect((await db.cola_sync.get(uuid))?.estado).toBe('error');
  });
});
```

- [ ] **Paso 2: Ejecutar el test y confirmar que falla**

```bash
npm run test -w apps/web -- src/lib/sync/processor.test.ts
```

- [ ] **Paso 3: Crear apps/web/src/lib/sync/processor.ts**

```typescript
import { getPendientes, marcarEnviada, marcarError } from './queue';
import { isTokenValid, getSession } from '@/lib/auth/session';
import { silentRefresh } from '@/lib/auth/refresh';
import type { OperacionPendiente } from '@/lib/db';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class SyncProcessor {
  private procesando = false;

  calcularBackoff(intentos: number): number {
    return Math.min(Math.pow(2, intentos) * 1000, 300_000);
  }

  async procesarCola(): Promise<void> {
    if (this.procesando) return;
    this.procesando = true;

    try {
      if (!(await isTokenValid())) {
        const ok = await silentRefresh();
        if (!ok) return;
      }

      const pendientes = await getPendientes();
      if (pendientes.length === 0) return;

      const sesion = await getSession();
      if (!sesion) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sesion.accessToken}`,
      };

      for (const op of pendientes) {
        await this.ejecutarOperacion(op, headers);
      }
    } finally {
      this.procesando = false;
    }
  }

  private async ejecutarOperacion(op: OperacionPendiente, headers: Record<string, string>): Promise<void> {
    const payload = op.payload as Record<string, unknown>;
    const evalId = payload['evaluacionServerId'] as string | undefined;

    try {
      let res: Response;

      if (op.tipo === 'INICIAR_EVALUACION' && evalId) {
        res = await fetch(`${API_BASE}/api/v1/evaluaciones/${evalId}/iniciar`, { method: 'POST', headers });
      } else if (op.tipo === 'RESPUESTAS' && evalId) {
        res = await fetch(`${API_BASE}/api/v1/evaluaciones/${evalId}/respuestas`, {
          method: 'POST', headers,
          body: JSON.stringify({ respuestas: payload['respuestas'] ?? [] }),
        });
      } else if (op.tipo === 'EVIDENCIA') {
        const form = new FormData();
        form.append('evaluacionId', (payload['evaluacionId'] as string) ?? '');
        if (payload['respuestaItemId']) form.append('respuestaItemId', payload['respuestaItemId'] as string);
        form.append('tipo', 'FOTO');
        if (payload['blob'] instanceof Blob) form.append('archivo', payload['blob'] as Blob, payload['nombreArchivo'] as string);
        const { Authorization } = headers;
        res = await fetch(`${API_BASE}/api/v1/evidencias`, {
          method: 'POST',
          headers: { Authorization },
          body: form,
        });
      } else if (op.tipo === 'FINALIZAR_EVALUACION' && evalId) {
        res = await fetch(`${API_BASE}/api/v1/evaluaciones/${evalId}/finalizar`, {
          method: 'POST', headers,
          body: JSON.stringify({ observacionesFinales: payload['observacionesFinales'] }),
        });
      } else {
        await marcarError(op.uuidLocal, 'tipo de operación desconocido o falta evaluacionServerId');
        return;
      }

      if (res.ok) {
        await marcarEnviada(op.uuidLocal);
      } else {
        await marcarError(op.uuidLocal, `HTTP ${res.status}`);
      }
    } catch (e) {
      await marcarError(op.uuidLocal, e instanceof Error ? e.message : 'error de red');
    }
  }

  iniciar(): void {
    window.addEventListener('online', () => void this.procesarCola());
    if (navigator.onLine) void this.procesarCola();
  }

  detener(): void { /* limpieza futura de listeners si se usa AbortController */ }
}
```

- [ ] **Paso 4: Ejecutar el test y confirmar que pasa**

```bash
npm run test -w apps/web -- src/lib/sync/processor.test.ts
```

Resultado esperado: 3 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/lib/sync/processor.ts apps/web/src/lib/sync/processor.test.ts
git commit -m "feat(web/sync): SyncProcessor — iniciar/respuestas/evidencia/finalizar con backoff"
```

---

## Task 14: Sync — useSyncStatus.ts

**Files:**
- Create: `apps/web/src/lib/sync/useSyncStatus.ts`
- Create: `apps/web/src/lib/sync/useSyncStatus.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// apps/web/src/lib/sync/useSyncStatus.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { db } from '@/lib/db';
import { enqueue } from './queue';
import { useSyncStatus } from './useSyncStatus';

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('useSyncStatus', () => {
  it('pendientes empieza en 0 con cola vacía', async () => {
    const { result } = renderHook(() => useSyncStatus());
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(result.current.pendientes).toBe(0);
  });

  it('pendientes aumenta al encolar una operación', async () => {
    await enqueue('RESPUESTAS', {});
    const { result } = renderHook(() => useSyncStatus());
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(result.current.pendientes).toBe(1);
  });

  it('enLinea refleja navigator.onLine', () => {
    const { result } = renderHook(() => useSyncStatus());
    expect(result.current.enLinea).toBe(navigator.onLine);
  });
});
```

- [ ] **Paso 2: Ejecutar el test y confirmar que falla**

```bash
npm run test -w apps/web -- src/lib/sync/useSyncStatus.test.ts
```

- [ ] **Paso 3: Crear apps/web/src/lib/sync/useSyncStatus.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { SyncProcessor } from './processor';

export interface SyncStatus {
  enLinea: boolean;
  pendientes: number;
  sincronizando: boolean;
  ultimaSync: number | null;
  sincronizar: () => void;
}

const processor = new SyncProcessor();

export function useSyncStatus(): SyncStatus {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<number | null>(null);

  const contarPendientes = useCallback(async () => {
    const n = await db.cola_sync.where('estado').equals('pendiente').count();
    setPendientes(n);
  }, []);

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      await processor.procesarCola();
      setUltimaSync(Date.now());
    } finally {
      setSincronizando(false);
      await contarPendientes();
    }
  }, [contarPendientes]);

  useEffect(() => {
    contarPendientes();
    const id = setInterval(contarPendientes, 5_000);
    const online = () => { setEnLinea(true); void sincronizar(); };
    const offline = () => setEnLinea(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [contarPendientes, sincronizar]);

  return { enLinea, pendientes, sincronizando, ultimaSync, sincronizar };
}
```

- [ ] **Paso 4: Ejecutar el test y confirmar que pasa**

```bash
npm run test -w apps/web -- src/lib/sync/useSyncStatus.test.ts
```

Resultado esperado: 3 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/lib/sync/useSyncStatus.ts apps/web/src/lib/sync/useSyncStatus.test.ts
git commit -m "feat(web/sync): useSyncStatus — contador pendientes, estado online/offline"
```

---

## Task 15: App shell — main.tsx + App.tsx

**Files:**
- Modify: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`

- [ ] **Paso 1: Reemplazar apps/web/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    return worker.start({ onUnhandledRequest: 'bypass' });
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

- [ ] **Paso 2: Crear apps/web/src/App.tsx**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { SyncProcessor } from '@/lib/sync/processor';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});

const theme = createTheme({
  palette: { primary: { main: '#1565C0' } },
});

const processor = new SyncProcessor();

export default function App() {
  useEffect(() => {
    processor.iniciar();
    return () => processor.detener();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<div style={{ padding: 32 }}>EBR — infraestructura lista ✓</div>} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Paso 3: Correr todos los tests**

```bash
npm run test -w apps/web
```

Resultado esperado: todos los tests en verde.

- [ ] **Paso 4: Verificar typecheck**

```bash
npm run typecheck -w apps/web
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Paso 5: Commit final**

```bash
git add apps/web/src/main.tsx apps/web/src/App.tsx
git commit -m "feat(web): app shell con QueryClient + MUI + BrowserRouter + SyncProcessor"
```

---

## Cobertura del spec

| Sección del spec | Task |
|---|---|
| §2 Stack | Tasks 1–4 |
| §3.1 Auth (login cookie, rol singular, refresh sin body) | Tasks 6, 7 |
| §3.2 Catálogo (secciones, opcionesRespuesta, aplanar) | Tasks 8, 9 |
| §3.3 Evaluaciones (iniciar/respuestas/finalizar, nivelCriticidad) | Task 13 |
| §3.4 Evidencias (multipart, campos DTO) | Task 13 |
| §4 Estructura de archivos | Tasks 1–4, 15 |
| §5 Dexie 8 tablas (sin catalogo_literal) | Task 5 |
| §6 Service worker (rutas /api/v1/) | Task 4 |
| §7 Cola sync (queue, processor, backoff) | Tasks 12, 13 |
| §7 useSyncStatus | Task 14 |
| §8 Auth offline (silentRefresh, credentials: include) | Tasks 6, 7 |
| §9 comprimirFoto | Task 11 |
| §10 MSW handlers con /api/v1/ | Task 3 |
| §11 Criterios de aceptación | Verificados por tests en cada task |
| §12 Brecha motor de riesgo | Task 10 (stub documentado) |
