# 12 - Planificación del Desarrollo

## 1. Objetivo

Proponer un orden de trabajo realista a partir del estado real verificado del proyecto (no del plan original), priorizando lo que bloquea todo lo demás. **Entrega: viernes 25 de septiembre de 2026.**

## 2. Decisiones que bloquean todo el resto del trabajo

Antes de escribir código nuevo, el equipo debe resolver, en este orden de urgencia:

### 2.1 ¿Se fusiona `feat/EBR-backend-api`, y en qué condiciones?

Es un backend NestJS+Prisma completo (~21.300 líneas, 117 archivos), hecho por Gabrielabdp en un solo commit, no fusionado a `main` ni `develop`. Es un fast-forward trivial en términos de git, pero el contenido no ha sido revisado por el equipo. Cubre la mayoría de los módulos del SRS con seguridad genuinamente sólida en varios aspectos (ver `07-SEGURIDAD.md`), pero con vacíos concretos (RF-07 sin cerrar el ciclo, RLS y MFA declarados pero no funcionales, sin auditoría real, sin PDF).

**Recomendación:** fusionar como base de trabajo, pero explícitamente marcada como "necesita correcciones antes de producción" — no como entrega final. Documentar las condiciones de la fusión en el PR correspondiente para que el equipo (y el Tech Lead que revisa el motor de riesgo/sincronización) las vea.

### 2.2 Reconciliar los dos esquemas de base de datos

`db/01_schema.sql` (51 tablas, tratado como oficial por toda la documentación existente) diverge de `apps/api/prisma/schema.prisma` (43 modelos) en 9 tablas — 6 faltantes, 3 añadidas sin documentar formalmente (`RefreshToken`, `InformeEvaluacion`, `Expediente`). Ver `05-MODELO-DATOS.md` §6 para el detalle exacto.

**Recomendación:** `db/01_schema.sql` es la fuente de verdad (tiene los triggers de integridad, los CHECK constraints, y los datos reales ya cargados). Regenerar `schema.prisma` desde ahí, no al revés. Formalizar `RefreshToken` como extensión oficial del esquema. Decidir explícitamente si `InformeEvaluacion`/`Expediente` se adoptan.

### 2.3 Portar el cierre del ciclo (RF-07) al backend

`db/05_funciones.sql` ya programa automáticamente la siguiente inspección al calcular el riesgo. `motor-riesgo.service.ts` en NestJS no lo hace. Esta es la pieza que la documentación del proyecto llama "lo que define la arquitectura" — sin ella, el sistema calcula el riesgo pero no cumple su propósito central.

### 2.4 Resolver A-01, A-02 y A-07 con DIGEMAPS

Bloqueantes documentados desde el inicio del proyecto (ver `03-REQUISITOS.md` §5). El sistema puede seguir construyéndose con los supuestos actuales, pero **no debe considerarse listo para producción** sin respuesta formal, porque afectan directamente al resultado del cálculo de riesgo sobre establecimientos reales.

## 3. Fases propuestas, ajustadas al estado real

### Fase A — Ya completada (verificar, no repetir)
- Documentación base: alcance, arquitectura, modelo de datos, hallazgos.
- Esquema de base de datos con 51 tablas, triggers de integridad, datos reales cargados.
- Motor de riesgo (`packages/risk-engine`), con 17 casos de prueba y verificación cruzada en PL/pgSQL.
- CI que valida `risk-engine` y `db/*.sql`.

### Fase B — En curso, requiere decisión antes de avanzar
- Revisar y fusionar `feat/EBR-backend-api` (§2.1).
- Reconciliar esquemas de base de datos (§2.2).
- Corregir la documentación de esa rama para que no afirme RLS/MFA como implementados cuando no lo están.

### Fase C — Cerrar el ciclo (prioridad más alta de código nuevo)
- Portar `fn_procesar_evaluacion` (cierre de ciclo) a `motor-riesgo.service.ts` (§2.3).
- Implementar el cuarto origen de `Caso` (programación institucional) en el backend.
- Prueba de integración que verifique el ciclo completo de punta a punta.

### Fase D — Completar los vacíos del backend existente
- Módulo de `establecimientos` (no existe hoy).
- Recuperación de contraseña.
- Corregir MFA (requiere añadir columna de secreto TOTP al esquema oficial) o deshabilitarlo explícitamente hasta corregirse.
- Reescribir `hardening.sql` con políticas RLS reales para el esquema de 51 tablas.
- Módulo de auditoría (la tabla existe, nada escribe en ella).
- Generación de PDF para informes y expedientes (RF-16, RF-19).
- Endpoint de corrección y reenvío tras devolución (RF-18).

### Fase E — Frontend
- Ratificar la decisión de stack: React + Vite (README) vs. React 18 + MUI (ADR-001) — no reconciliados entre sí.
- Construir `apps/web` desde cero: no existe ninguna línea de código todavía.
- Dashboards por rol, ejecución de ficha BPM con feedback de riesgo en tiempo real vía `packages/risk-engine` embebido, captura de evidencias.
- Capacidades PWA: instalación, service worker, IndexedDB o equivalente para `operacion_pendiente`.

### Fase F — Estabilización
- Pipeline de CI para `apps/api` (hoy inexistente).
- Pruebas de integración y de seguridad descritas en `10-PLAN-PRUEBAS.md`.
- Definir estrategia de despliegue real (hoy solo hay entorno de desarrollo — ver `11-DESPLIEGUE.md`).
- Cerrar A-01, A-02, A-07 con DIGEMAPS antes de considerar el sistema listo para producción.

## 4. Dependencias críticas entre fases

```text
Reconciliación de esquemas (B)
        |
Cierre del ciclo (C)  <-- bloqueante para dar por buena la arquitectura central
        |
Completar backend (D)
        |
Frontend (E)  <-- independiente en el tiempo, pero sin datos reales
        |         del backend no se puede probar de punta a punta
Estabilización (F)
```

La Fase E (frontend) puede empezar en paralelo a D si el equipo tiene capacidad, ya que el diseño de API (`06-API.md`) es suficientemente estable para no bloquear UI — pero cualquier prueba de punta a punta necesita que C esté resuelto primero.

## 5. Riesgos principales para la fecha de entrega (25 de septiembre)

| Riesgo | Impacto |
|---|---|
| Fusionar el backend sin revisión adecuada del equipo | Alto — puede introducir la divergencia de esquemas como deuda permanente |
| No cerrar el ciclo (RF-07) a tiempo | Alto — es la funcionalidad que define el proyecto ante DIGEMAPS |
| Construir el frontend desde cero en el tiempo restante | Alto — es la fase más grande y no ha empezado |
| A-01/A-02 sin respuesta de DIGEMAPS antes de la entrega | Alto — el cálculo de riesgo quedaría formalmente basado en supuestos no confirmados |
| RLS/MFA rotos llegando a la entrega sin corregir | Medio-Alto — riesgo de seguridad real en un sistema gubernamental |
| Sin pipeline de CI para el backend | Medio — regresiones no detectadas automáticamente |

## 6. Definición de terminado por módulo

Un módulo no se considera terminado hasta que:
- Cumple los requisitos funcionales asociados de `03-REQUISITOS.md`.
- Usa `packages/risk-engine` para cualquier cálculo de riesgo, sin reimplementar lógica.
- No introduce números de dominio hardcodeados.
- Respeta los roles definidos en `08-ROLES-PERMISOS.md`.
- Tiene pruebas automatizadas (unitarias o de integración, según corresponda).
- La documentación de este set (`docs-ebr-bpm/`) se actualiza si el módulo cambia algo que estos documentos describen.

## 7. Pendientes antes de comprometer un calendario definitivo por persona

- Disponibilidad semanal real de cada integrante del equipo hasta el 25 de septiembre.
- Quién asume la revisión y eventual corrección de la rama `feat/EBR-backend-api` (Tech Lead según `CONTRIBUTING.md`, dado que toca el motor de riesgo y la sincronización).
- Proceso de aprobación con DIGEMAPS para A-01, A-02 y A-07 — tiempo de respuesta esperado, para saber si es realista resolverlos antes de la entrega o si el equipo debe entregar con los supuestos documentados como definitivos "hasta nueva instrucción".
