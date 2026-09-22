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

> **Límite confirmado (2026-09-19):** "Frontend PWA" (Ash) cubre exclusivamente la capa de infraestructura PWA: service worker, instalabilidad, caché offline, sincronización de `operacion_pendiente` al reconectar, y compatibilidad multiplataforma (RNF-05). "Frontend Aplicación" (Jorge) cubre todas las pantallas, flujos de negocio y consumo de la API REST. Cualquier componente de UI que requiera lógica de negocio es responsabilidad de Jorge. Cualquier comportamiento que persista o funcione sin conexión es responsabilidad de Ash.

## 3. Cómo esto se relaciona con el resto de la documentación

- El rol de **Base de datos** (Gabriela) es quien más directamente cruza con `05-MODELO-DATOS.md` §6 (reconciliación de esquemas) y con el backend descrito en `06-API.md` y `07-SEGURIDAD.md`.
- Los roles de **Frontend PWA** y **Frontend Aplicación** (Ash y Jorge) son responsables de construir todo lo que aparecía como 🟡 o ❌ §3.4 y en el gap analysis de `03-REQUISITOS.md` (RNF-01, RNF-05).
- El rol de **Calidad** (Rowlis) es el dueño natural de `10-PLAN-PRUEBAS.md`, y debería ser quien valide los criterios de aceptación de `01-ALCANCE.md` §9 antes de la entrega.
- El **Tech Lead** (Diana) es quien, según `CONTRIBUTING.md`, debe aprobar cualquier PR sobre `packages/risk-engine` o sobre la lógica de sincronización — incluyendo el trabajo de cierre de ciclo descrito en `12-PLANIFICACION.md` §2.3.
