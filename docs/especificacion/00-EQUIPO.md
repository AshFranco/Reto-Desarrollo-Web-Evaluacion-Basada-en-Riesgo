# 00 - Equipo de Trabajo

## 1. Objetivo

Registrar los roles de trabajo asignados al equipo para el proyecto EBR/BPM, según lo acordado internamente (encuesta del equipo, agosto 2026). Esto es organización interna del equipo, **no forma parte del SRS**.

## 2. Roles asignados

| Persona | Rol de trabajo | Responsabilidad principal |
|---|---|---|
| Diana Estephan | Tech Lead | Revisión técnica general; según `CONTRIBUTING.md`, aprueba obligatoriamente todo PR que toque el motor de riesgo o la sincronización |
| Gabriela Duverge | Base de datos | Esquema SQL (`db/*.sql`), backend (autora de `apps/api` en la rama `feat/EBR-backend-api`) |
| Ash | Frontend PWA | Capacidades PWA: instalación, offline, sincronización, service worker |
| Jorge | Frontend Aplicación | Pantallas y lógica de negocio del frontend (dashboards, formularios, flujos por rol) |
| Rowlis | Rol de Calidad | QA — pruebas, verificación de criterios de aceptación, plan de pruebas |

> **Nota:** "Frontend PWA" y "Frontend Aplicación" son dos roles distintos dentro del mismo `apps/web` — uno cubre la capa de PWA (offline, sincronización, instalabilidad) y el otro la aplicación en sí (pantallas, flujos, consumo de la API). Conviene que el equipo confirme por escrito el límite exacto entre ambos para evitar solapamiento o vacíos, ya que el SRS no distingue estas dos capas explícitamente.
>
> **Límite confirmado (2026-09-19)** — basado en el patrón ya implementado en `EjecutarEvaluacion.tsx`, donde las pantallas consumen la infraestructura PWA como librería:
> - **Frontend PWA (Ash):** todo lo que vive en `apps/web/src/lib/` (`sync/queue.ts` y `sync/processor.ts`, `db/schema.ts` e IndexedDB, `fotos/compressor.ts`, `motor/useMotorRiesgo.ts`) más `src/sw.ts` y el manifest/configuración de instalabilidad. Es la capa offline-first, expuesta como funciones/hooks para que las pantallas la importen.
> - **Frontend Aplicación (Jorge):** las pantallas en `src/pages/` (wizard de inspección, dashboards, formularios, flujos por rol) que importan y consumen esa infraestructura, y la lógica de negocio propia de cada pantalla.
> - Confirmado por el equipo/Jorge. Cierra el pendiente que estaba abierto en la sección 4.

## 3. Cómo esto se relaciona con el resto de la documentación

- El rol de **Base de datos** (Gabriela) es quien más directamente cruza con `05-MODELO-DATOS.md` §6 (reconciliación de esquemas) y con el backend descrito en `06-API.md` y `07-SEGURIDAD.md`.
- Los roles de **Frontend PWA** y **Frontend Aplicación** (Ash y Jorge) son responsables de construir todo lo que hoy aparece como ❌ en `02-ARQUITECTURA.md` §3.4 y en el gap analysis de `03-REQUISITOS.md` (RF-04, RF-11 vistas, RF-13 ficha dinámica, RNF-01).
- El rol de **Calidad** (Rowlis) es el dueño natural de `10-PLAN-PRUEBAS.md`, y debería ser quien valide los criterios de aceptación de `01-ALCANCE.md` §9 antes de la entrega.
- El **Tech Lead** (Diana) es quien, según `CONTRIBUTING.md`, debe aprobar cualquier PR sobre `packages/risk-engine` o sobre la lógica de sincronización — incluyendo el trabajo de cierre de ciclo descrito en `12-PLANIFICACION.md` §2.3.

## 4. Pendiente

- Definir quién, dentro del equipo, revisa y decide sobre la fusión de `feat/EBR-backend-api` (ver `12-PLANIFICACION.md` §2.1) — por defecto sería el Tech Lead, pero no está confirmado explícitamente.
