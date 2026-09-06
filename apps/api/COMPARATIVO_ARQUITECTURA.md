# Comparativo de arquitectura — Backend EBR/BPM
### Para discusión de equipo — resolución de ADR-001 (Stack de backend)

Este documento compara dos implementaciones independientes hechas para el
mismo reto, con el objetivo de decidir en equipo cómo avanzar — no de
determinar cuál es "mejor" en abstracto, sino cuál sirve mejor al proyecto
considerando lo que cada una ya tiene resuelto.

---

## 1. Resumen ejecutivo

| | Repo del equipo (`Reto-Desarrollo-Web...`) | Backend independiente (NestJS) |
|---|---|---|
| **Estructura** | Monorepo (`apps/api`, `apps/web`, `packages/risk-engine`, `packages/shared-types`) | Proyecto único (backend solamente) |
| **Motor de riesgo** | Paquete TypeScript compartido cliente/servidor + espejo en PL/pgSQL para verificación cruzada | Servicio dentro del backend (`MotorRiesgoService`), sin contraparte en cliente |
| **Esquema de BD** | 51 tablas, jerarquía auto-referenciada, versionado explícito de catálogos, sincronización offline, auditoría completa | ~25 tablas, estructura plana por dominio, sin soporte offline |
| **Ambigüedades del dominio** | Marcadas explícitamente en datos (`es_supuesto = TRUE`) con nota | Resueltas con criterio propio, sin marcar como abierto |
| **Estado de avance** | Estructura y esquema completos; backend (`apps/api`) sin implementar aún | Backend completo, probado end-to-end contra PostgreSQL real, con tests automatizados |
| **Flujo de Git** | Conventional Commits, PR obligatorio, ramas protegidas, hooks de equipo | Ninguno definido aún |

---

## 2. Lo que el repo del equipo resuelve mejor

### 2.1 Soporte offline real (requisito RNF-01 del SRS)
El SRS pide explícitamente que la PWA "funcione sin conexión" y "sincronice
cuando exista internet". El repo del equipo ya tiene la arquitectura para
esto:
- `packages/risk-engine` es un **paquete compartido** que el frontend puede
  ejecutar localmente sin conexión (el técnico ve el puntaje en campo, sin
  señal) y el backend usa la **misma implementación** como autoridad final.
- Tabla `operacion_pendiente` — cola de sincronización con `uuid_local`
  para garantizar que reenviar una operación no la duplique.
- Campo `evaluacion.version_registro` — control optimista de concurrencia,
  necesario cuando el mismo registro se edita offline y luego sincroniza.

**El backend NestJS no tiene nada de esto** — el motor de riesgo vive
únicamente en el servidor, lo cual funcionaría para una app 100% online,
pero no cumple el requisito de funcionamiento offline del SRS tal cual
está.

### 2.2 Jerarquía de la ficha BPM sin límite de profundidad
El esquema del equipo modela `item_ficha` como una tabla auto-referenciada
(`id_padre`), soportando cualquier nivel de anidamiento sin cambiar el
esquema. El backend NestJS modela la ficha con un solo nivel fijo
(Sección → Ítem) — funciona para la versión actual de la ficha (34
secciones, 45 ítems), pero si una futura revisión de la ficha agrega un
nivel adicional de subsecciones, el esquema plano no lo soporta sin
migración.

### 2.3 Trazabilidad explícita de ambigüedades
El repo del equipo marca en la propia base de datos qué reglas son
supuestos sin confirmar por la DIGEMAPS (`es_supuesto = TRUE`,
`rango_nivel_riesgo`, sobre la conversión de escala 2-8 a Bajo/Medio/Alto).
Esto es honestidad de ingeniería que vale la pena preservar: cuando llegue
la respuesta oficial, corregirlo es un `UPDATE`, no arqueología de código.

### 2.4 Auditoría e importación versionada
Tablas `auditoria`, `importacion_excel`, `importacion_detalle` — trazan de
dónde vino cada dato y quién hizo qué. El backend NestJS tiene una
`log_auditoria` más simple, sin el detalle de importación por fila.

---

## 3. Lo que el backend NestJS resuelve mejor (o ya tiene probado)

### 3.1 Está funcionando de punta a punta, con datos reales
No es una comparación de diagramas — el backend NestJS ya se levantó
contra una base PostgreSQL real, con:
- Los 45 ítems / 34 secciones de la Ficha BPM cargados desde el Excel real
- Las 105 categorías de la Matriz de Riesgo cargadas
- Los 6 factores de riesgo con sus pesos y 24 opciones cargados
- Login, autenticación, RBAC y Row-Level Security probados con peticiones HTTP reales
- Un test automatizado (`motor-riesgo.spec.ts`) que verifica las fórmulas RE/RP/RT contra los casos límite exactos de la hoja de cálculo original

El repo del equipo, según el propio README, tiene el esquema y los seeds,
pero `apps/api` (el backend en sí) aún no está implementado.

### 3.2 Seguridad ya implementada y verificada
- Row-Level Security con políticas reales, probadas en pgAdmin (10 políticas activas confirmadas)
- Argon2id para contraseñas, JWT con refresh rotativo en cookie httpOnly
- Validación de archivos por magic bytes real (no el MIME declarado)
- Guards de autorización en dos capas (aplicación + base de datos)

No hay evidencia en el repo del equipo de que esta capa de seguridad ya
esté implementada (el schema SQL no muestra políticas RLS todavía, por
ejemplo).

### 3.3 Regla de aprobación de la ficha, verificada exactamente
El backend NestJS extrajo y verificó automáticamente (con test) que:
`NC Críticas > 1` → rechazo inmediato; `% > 60` y `NC Mayores ≤ 5` →
aprueba; si no, plan de corrección. Esto coincide con la fórmula real del
Excel. El esquema del equipo tiene los campos para esto
(`max_nc_criticas`, `max_nc_mayores`, `porcentaje_minimo_aprobacion` en
`version_ficha`) pero al no haber `apps/api` implementado aún, no hay
evidencia de que la lógica esté corriendo y verificada.

---

## 4. Diferencias de modelado que el equipo debe resolver en conjunto

| Punto | Repo del equipo | Backend NestJS | Necesita decisión |
|---|---|---|---|
| Nivel de criticidad (C/M/Me) | Columna en `item_ficha.criticidad_id`, marcada como **pendiente de asignar** (ADR A-02: "Quién asigna la criticidad") | Se modela en la respuesta (`respuesta_evaluacion.nivelCriticidad`), asignada por el técnico durante la inspección | **Sí** — son dos modelos distintos del mismo problema. Al revisar la ficha original, la columna "NC" se llena por el inspector durante la evaluación, no es fija por ítem — esto apoya el modelo de "respuesta", pero el equipo debe confirmar/cerrar el ADR A-02 con esa evidencia. |
| Conversión de escala 2-8 → Bajo/Medio/Alto | Marcado explícitamente como supuesto sin confirmar (ADR A-01) | Se resolvió con una regla propia (≤2.5 Bajo, ≤5 Medio, resto Alto) sin marcarla como abierta | **Sí** — ninguna de las dos tiene la fuente oficial confirmada; hay que decidir juntos o consultar a la DIGEMAPS. |
| ¿Permiso sanitario depende de aprobar la inspección? | Marcado como pendiente (ADR A-07) | No implementado | **Sí**, pendiente en ambos. |

---

## 5. Recomendación para la discusión de equipo

No es necesario elegir "todo de uno o todo del otro". Una ruta razonable:

1. **Usar el esquema de base de datos del repo del equipo** como la fuente
   de verdad — es más completo y ya resuelve el requisito de offline/sync
   que el SRS exige y que el backend NestJS no cubre.
2. **Usar el backend NestJS como referencia de implementación** para
   `apps/api` — la lógica de negocio (cálculo de puntaje, motor de riesgo,
   guards de seguridad, RLS) ya está escrita y verificada; se puede
   adaptar a los nombres de tabla/columnas del esquema del equipo en vez
   de reescribirla desde cero.
3. **Cerrar los ADRs abiertos (A-01, A-02, A-07, ADR-001)** en una reunión
   corta, con la evidencia de ambos lados sobre la mesa — sobre todo A-02
   (criticidad), donde ya hay evidencia concreta del Excel original que
   apunta a un modelo específico.

Esto evita: (a) perder el trabajo de modelado ya hecho por el compañero,
y (b) reescribir desde cero la lógica de negocio y seguridad ya probada.
