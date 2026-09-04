# Documentación del Proyecto — EBR/BPM

Esta carpeta contiene la documentación técnica y funcional del **Sistema PWA para Evaluación Basada en Riesgo (EBR/BPM)**, generada a partir del SRS oficial y del **estado real verificado del repositorio** (código, no solo README) al 2026-09-03.

**Cliente:** Ministerio de Salud Pública — DIGEMAPS
**Entrega:** viernes 25 de septiembre de 2026

## Índice

0. [Equipo de Trabajo](00-EQUIPO.md)
1. [Alcance](01-ALCANCE.md)
2. [Arquitectura](02-ARQUITECTURA.md)
3. [Requisitos](03-REQUISITOS.md)
4. [Casos de Uso](04-CASOS-DE-USO.md)
5. [Modelo de Datos](05-MODELO-DATOS.md)
6. [Diseño de API REST](06-API.md)
7. [Seguridad](07-SEGURIDAD.md)
8. [Roles y Permisos](08-ROLES-PERMISOS.md)
9. [Flujos de Negocio](09-FLUJOS-NEGOCIO.md)
10. [Plan de Pruebas](10-PLAN-PRUEBAS.md)
11. [Despliegue](11-DESPLIEGUE.md)
12. [Planificación](12-PLANIFICACION.md)

## Convención de honestidad documental

Estos documentos distinguen explícitamente tres cosas, que no deben confundirse entre sí:

- **Requisito textual del SRS** — lo que el cliente pidió.
- **Decisión o propuesta del equipo** — lo que el equipo eligió para implementarlo, no exigido literalmente por el SRS.
- **Estado real verificado en código** — qué existe hoy, con su leyenda: ✅ completo · 🟡 parcial · ❌ no iniciado o roto · 🔵 propuesto, sin implementar.

Cuando algo está declarado como "hecho" en documentación de una rama pero el código no lo respalda (por ejemplo, Row-Level Security), estos documentos lo señalan explícitamente en vez de repetir la afirmación. Esa es la razón de ser de este set de documentos: evitar que el equipo, o DIGEMAPS, tomen decisiones sobre una base que no es cierta.

## Fuentes principales

- SRS oficial — Reto Julio-Septiembre 2026.
- `CONTEXTO_PROYECTO.md` — auditoría del estado real del repositorio, generada leyendo el código (no el README) el 2026-09-03.
- `docs/hallazgos.md` — defectos encontrados en los archivos fuente Excel.
- `docs/adr/001-stack.md` — decisión de stack, estado: propuesto, no ratificado.

## Hallazgos más importantes a tener presentes

1. **El ciclo no se cierra en el backend.** La pieza que define la arquitectura del proyecto — que el resultado de una inspección programe automáticamente la siguiente — existe en SQL puro (`db/05_funciones.sql`) pero no está portada al backend NestJS.
2. **Hay un backend completo sin fusionar.** `feat/EBR-backend-api` (NestJS + Prisma) cubre la mayoría del SRS a nivel de API, pero diverge del esquema de base de datos oficial y no ha sido revisado por el equipo.
3. **RLS y MFA están documentados como implementados y no lo están.** Ver `07-SEGURIDAD.md`.
4. **No existe frontend en ninguna rama.** RNF-01 (PWA offline) está en cero.
5. **A-01, A-02 y A-07 siguen sin respuesta de DIGEMAPS** — bloqueantes desde el inicio del proyecto.

## Stack de referencia (propuesto, no ratificado formalmente)

- Backend: NestJS + TypeScript + Prisma + PostgreSQL.
- Motor de riesgo: paquete TypeScript compartido (`packages/risk-engine`), verificado en PL/pgSQL.
- Frontend web: React + Vite (PWA) — o React 18 + MUI según `docs/adr/001-stack.md`; no reconciliado entre ambas fuentes.
