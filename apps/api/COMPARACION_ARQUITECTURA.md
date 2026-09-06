# Comparación de arquitecturas — Backend EBR/BPM
## Para discusión de equipo (ADR-001: Stack de backend, pendiente)

> **✅ DECISIÓN TOMADA**: el equipo adoptó el esquema de base de datos de
> 51 tablas (documento B) como fuente de verdad oficial. Este documento se
> conserva como registro histórico de la comparación y, en particular, del
> hallazgo de la sección 3 (Factor 3 "Cumplimiento BPM" automático), que
> ya fue incorporado a `prisma/schema.prisma` y `motor-riesgo.service.ts`.

Este documento compara objetivamente dos implementaciones independientes
hechas por el equipo, para apoyar la decisión de ADR-001. No es una defensa
de ninguna de las dos — el objetivo es que el equipo decida con información
completa.

---

## 1. Resumen ejecutivo

| | Implementación A (Gabriela) | Implementación B (Compañero) |
|---|---|---|
| Framework backend | NestJS (sobre Express) | Pendiente (ADR-001 abierto) |
| Esquema de BD | ~25 tablas | 51 tablas |
| **Estado actual** | **Corriendo, probado end-to-end con datos reales** | Esquema y motor de riesgo diseñados; backend por construir |
| Soporte offline (PWA) | ❌ No contemplado | ✅ Diseñado explícitamente |
| Motor de riesgo compartido cliente/servidor | ❌ Solo en el backend | ✅ Paquete `risk-engine` independiente |
| Ficha BPM: profundidad de jerarquía | 2 niveles fijos (Sección → Ítem) | Arbitraria (auto-referenciada) |
| RBAC | 5 roles fijos, hardcodeados en decoradores | Roles + permisos configurables (tabla `rol_permiso`) |
| Trazabilidad de ambigüedades del dominio | No | Sí (`es_supuesto`, columnas `nota_revision`) |
| Row-Level Security | ✅ Implementado y verificado en pgAdmin | No implementado aún (no visible en el DDL compartido) |
| Tests automatizados | ✅ 4 tests del motor de riesgo, pasando | `packages/risk-engine/tests/motor.test.ts` — 17 casos (según README), no verificados por mí |

---

## 2. Lo que el esquema de la Implementación B hace mejor

### 2.1 Soporte offline real (requisito RNF-01 del SRS)

El SRS pide explícitamente: *"Funcionar sin conexión"* y *"Sincronizar cuando
exista internet"*. Mi implementación (A) **no contempla esto en absoluto** —
asumí conexión permanente. La Implementación B sí lo resuelve:

- `evaluacion.uuid_local`, `respuesta_item.uuid_local`,
  `evidencia.uuid_local`: generados en el cliente, permiten idempotencia
  (reenviar la misma evaluación dos veces no la duplica).
- `evaluacion.version_registro`: control de concurrencia optimista para
  cuando dos dispositivos editan el mismo registro tras reconectar.
- `operacion_pendiente`: cola de sincronización — espejo en servidor de lo
  que el cliente tiene pendiente de subir.

**Esto es un vacío real en mi implementación**, no un detalle de estilo.

### 2.2 Motor de riesgo como paquete compartido

`packages/risk-engine` se importa tanto en `apps/api` como en `apps/web`.
Justificación válida: el técnico necesita ver el puntaje en tiempo real sin
conexión (cálculo en el cliente), pero el servidor debe ser la autoridad
final (recalcula al sincronizar). Con dos implementaciones separadas del
mismo cálculo, corregir una fórmula significa tocar dos lugares que
tarde o temprano divergen.

Mi implementación (A) solo calcula en el servidor — no funciona si el
técnico está sin señal en el campo, que es justamente el escenario que
más necesita el cálculo (una inspección presencial).

### 2.3 Jerarquía de la ficha con profundidad arbitraria

La Implementación B modela `item_ficha` con auto-referencia (`id_padre`),
soportando cualquier nivel de anidamiento sin cambiar el esquema. Mi
implementación (A) fijó dos niveles (`SeccionFormulario` → `ItemFormulario`),
que **coincidentemente funcionó** para la versión actual de la ficha (que
en la práctica solo usa 2 niveles reales para los 45 ítems evaluables),
pero se rompería si una futura versión de la ficha agrega un tercer nivel.

### 2.4 RBAC más flexible

B tiene `rol_permiso` (muchos a muchos) con permisos granulares por código
(`evaluacion.ejecutar`, `catalogo.editar`). A tiene 5 roles fijos como enum,
con decoradores `@Roles(RolUsuario.COORDINADOR, ...)` hardcodeados en cada
endpoint. B permite ajustar permisos sin tocar código; A requiere redeploy
para cualquier cambio de permisos.

### 2.5 Trazabilidad de ambigüedades del dominio

B marca explícitamente en la propia base de datos qué reglas son
*supuestos* del equipo, no hechos confirmados por DIGEMAPS (ej.
`rango_nivel_riesgo.es_supuesto`, con nota explicando la ambigüedad A-01
sobre la conversión de escala 2-8 a Bajo/Medio/Alto — el mismo problema
que yo resolví con una fórmula fija de promedio, sin dejar constancia de
que es una interpretación). Esto es buena práctica de ingeniería que mi
implementación no tiene.

---

## 3. Hallazgo importante: posible diferencia en la lógica del Factor 3

Esto **no es una preferencia de estilo — es una posible diferencia real de
comportamiento** que el equipo debe resolver antes de avanzar, sin importar
qué backend se elija.

En la Implementación B, la tabla `factor_riesgo_establecimiento` tiene una
columna `es_automatico`, y el comentario del schema dice:

> *"TRUE en el factor 3 (Cumplimiento BPM): su opción se deriva del
> porcentaje de cumplimiento de la evaluación, no se digita."*

Es decir: el Factor 3 ("Cumplimiento BPM", el de mayor peso — 56%) **no
sería una opción que el inspector elige manualmente**, sino que se calcula
automáticamente a partir del `% de cumplimiento` que arroja la Ficha BPM de
esa misma evaluación.

**Mi implementación (A) trata los 6 factores como selecciones manuales
independientes** — incluyendo el Factor 3, que en mis pruebas seleccioné a
mano (`">80%"`) como si fuera una opinión del inspector, no un dato
derivado.

Si la interpretación de B es correcta, es un hallazgo importante: significa
que el Motor de Riesgo y la Ficha BPM **no son dos cálculos independientes**
como los implementé — el resultado de la ficha alimenta directamente uno de
los 6 factores del establecimiento. Esto tiene sentido lógico (una empresa
con mala ficha de inspección debería, automáticamente, tener mayor riesgo
de establecimiento) y explicaría por qué el Factor 3 tiene el peso más alto
(56% de 100%).

**Esto no está confirmado en ninguno de los 3 documentos fuente de forma
explícita** — ninguno de los dos hicimos mal el trabajo, es genuinamente
ambiguo en el Excel original. Pero es una pregunta que el equipo necesita
resolver con una sola respuesta, porque cambia el resultado del cálculo.

---

## 4. Lo que la Implementación A aporta

### 4.1 Es la única que corre hoy, de punta a punta

No es una ventaja de diseño, es una ventaja de **estado de avance**: hoy
mismo se verificó, contra una base de datos PostgreSQL real:

- Los 45 ítems / 34 secciones de la Ficha BPM cargados y accesibles vía API
- Las 105 categorías de alimento de la Matriz de Riesgo
- Los 6 factores de riesgo con sus pesos y opciones reales
- Row-Level Security funcionando (verificado con `pg_policies`, y probado
  que el cálculo de riesgo end-to-end da los valores esperados)
- Login, JWT, RBAC, y un cálculo completo de motor de riesgo con una
  empresa real de prueba

Esto tiene valor como **validación de que los datos y fórmulas extraídas
de los 3 Excel son correctos** — independientemente de cuál backend gane,
los archivos `prisma/seed-data/*.json` (extraídos directamente de los
Excel con Python) son un buen insumo para poblar `db/03_seed_ficha_bpm.sql`
y `db/04_seed_matriz_alimentos.sql` de la Implementación B, evitando
re-hacer esa extracción desde cero.

### 4.2 Row-Level Security implementado y verificado

No aparece en el DDL de B (`prisma/sql/hardening.sql` en A tiene 10
políticas activas, confirmadas). Si B no lo tiene planeado, es un
requisito de seguridad que falta agregar sin importar qué backend se elija.

---

## 5. Recomendación para la discusión de equipo

No me corresponde decidir por el equipo, pero aquí un punto de partida
razonable para la conversación:

1. **El esquema de base de datos de B es más completo y maduro** — cubre
   el requisito de PWA offline que A no contempló, y tiene mejor
   trazabilidad de decisiones. Sugiero usarlo como base.
2. **Los datos extraídos de los 3 Excel (`prisma/seed-data/*.json` de A)
   pueden reutilizarse** para poblar los scripts de seed de B, ahorrando
   el trabajo de volver a parsear los archivos fuente.
3. **La pregunta del Factor 3 automático (sección 3) debe resolverse
   primero**, antes de escribir el motor de riesgo definitivo — afecta a
   cualquier implementación, sin importar el stack.
4. **Row-Level Security debe agregarse al esquema de B** — es un
   requisito de seguridad, no específico de PostgreSQL vs. otro motor,
   y B ya usa PostgreSQL.
5. Si el equipo decide backend en NestJS (ADR-001), la lógica de
   `MotorRiesgoService` y `EvaluacionesService` de A pueden servir de
   referencia para `apps/api`, adaptando los nombres de tabla al esquema
   de B.
