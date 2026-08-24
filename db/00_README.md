# Base de datos — Sistema PWA de Evaluación Basada en Riesgo (EBR/BPM)

PostgreSQL 16+ · esquema `ebr` · **51 tablas** en 8 módulos

## Orden de ejecución

```bash
psql -U postgres -d ebr -f 01_schema.sql              # DDL: 51 tablas, triggers, índices
psql -U postgres -d ebr -f 02_seed_catalogos.sql      # Roles, permisos, 6 factores, frecuencias
psql -U postgres -d ebr -f 03_seed_ficha_bpm.sql      # 90 nodos, 45 criterios evaluables
psql -U postgres -d ebr -f 04_seed_matriz_alimentos.sql  # 17 categorías, 111 subcategorías
psql -U postgres -d ebr -f 05_funciones.sql           # Motor de riesgo
psql -U postgres -d ebr -f 06_pruebas.sql             # Pruebas (termina en ROLLBACK)
```

O de una vez:

```bash
for f in 0[1-6]_*.sql; do psql -U postgres -d ebr -f "$f" || break; done
```

Con Docker:

```bash
docker run -d --name ebr-db -e POSTGRES_PASSWORD=ebr -e POSTGRES_DB=ebr -p 5432:5432 postgres:16
sleep 5
for f in 0[1-6]_*.sql; do docker exec -i ebr-db psql -U postgres -d ebr < "$f"; done
```

## Contenido de los archivos

| Archivo | Contenido |
|---|---|
| `01_schema.sql` | DDL completo. 51 tablas, 3 triggers de integridad, índices parciales |
| `02_seed_catalogos.sql` | 5 roles, 20 permisos, 6 factores con sus 24 opciones, matriz de frecuencias |
| `03_seed_ficha_bpm.sql` | **Generado desde el Excel.** 90 nodos jerárquicos, 45 criterios evaluables |
| `04_seed_matriz_alimentos.sql` | **Generado desde el Excel.** 17 categorías, 111 subcategorías |
| `05_funciones.sql` | Motor de riesgo: 6 funciones y 3 vistas |
| `06_pruebas.sql` | 7 casos de prueba del motor + 2 de integridad |

Los archivos 03 y 04 se generaron leyendo los `.xlsx` con `openpyxl`, no transcribiendo a mano. Cada uno termina con un bloque `DO $$` que lanza excepción si el conteo no coincide con lo esperado.

## Verificación del motor contra el Excel

El motor reproduce el ejemplo original **exactamente**:

| Escenario | RE | RT | Frecuencia |
|---|---|---|---|
| Ejemplo del Excel (factor 6 devuelve `FALSE`) | 1.2067 | 3.6201 | Semestral |
| Mismo caso con el factor 6 corregido | 1.3931 | 4.1793 | Semestral |

Desglose con el factor 6 corregido:

| Factor | Puntaje | Peso | Aporte |
|---|---|---|---|
| 1 Volumen de producción | 1.00 | 0.16 | 0.1600 |
| 2 Implementación HACCP | 3.00 | 0.09 | 0.2700 |
| 3 Cumplimiento BPM | 1.00 | 0.56 | 0.5600 |
| 4 Proveedor INABIE | 2.33 | 0.05 | 0.1165 |
| 5 Rechazos Registro Sanitario | 1.67 | 0.06 | 0.1002 |
| 6 Plan de muestreo | 2.33 | 0.08 | 0.1864 |
| | | **1.00** | **1.3931** |

## Defectos del archivo fuente encontrados y manejados

| ID | Defecto | Manejo en la base de datos |
|---|---|---|
| **D-01** | Factor 6 devuelve `FALSE`: la celda dice *"Plan de muestreo en materias primas"* y la fórmula compara contra *"Tiene plan de muestreo microbiológico solo para las materias primas"* | Imposible por diseño: `opcion_factor` con clave foránea |
| **D-02** | Filas con `#N/A` propagado | Rechazadas en la importación, registradas en `importacion_detalle` |
| **D-03** | 5 subcategorías sin nivel de riesgo | `requiere_revision = TRUE` + vista `v_catalogo_incompleto` |
| **D-04** | Columna de criticidad (C/M/Me) vacía en los 45 criterios | `criticidad_id` nullable; se asigna desde el ABM de catálogo |
| **D-06** | *Alimentos preparados* declarada como categoría con riesgo BAJO pero **sin ninguna subcategoría** (fila 102) | Se crea subcategoría homónima marcada para revisión |

## Ambigüedad pendiente (A-01)

Falta la regla que convierte el riesgo total de la matriz de alimentos (escala 2–8) al nivel Bajo/Medio/Alto (escala 1–3). **No está en ningún archivo fuente.**

Se modeló como tabla configurable `rango_nivel_riesgo` con el supuesto `2.0–2.9 → BAJO · 3.0–5.9 → MEDIO · 6.0–8.0 → ALTO`, marcado con `es_supuesto = TRUE`.

```sql
-- Cuando la DIGEMAPS confirme la regla:
UPDATE rango_nivel_riesgo
   SET limite_inferior = ?, limite_superior = ?, es_supuesto = FALSE, nota = NULL
 WHERE version_matriz_id = ?;
```

No hay que tocar código.

## Consultas de ejemplo

```sql
-- Árbol completo de la ficha, ordenado
SELECT numeracion, titulo, nivel, es_evaluable
  FROM fn_arbol_ficha((SELECT id FROM version_ficha WHERE estado='PUBLICADA'));

-- Porcentaje de cumplimiento de una evaluación
SELECT * FROM fn_calcular_cumplimiento(1);

-- Cálculo completo: escribe el snapshot y programa la próxima inspección
SELECT fn_procesar_evaluacion(1);

-- Desglose auditable del RE
SELECT jsonb_pretty(re_detalle) FROM calculo_riesgo WHERE evaluacion_id = 1;

-- Establecimientos con inspección vencida
SELECT * FROM v_inspecciones_vencidas ORDER BY dias_vencida DESC;

-- Subcategorías con datos incompletos en el archivo fuente
SELECT * FROM v_catalogo_incompleto;
```

## Notas de diseño

**Jerarquía auto-referenciada.** `item_ficha.id_padre` con CTE recursiva, en lugar de una tabla por nivel. La ficha llega hoy a 5 niveles (7 secciones → 15 → 28 → 33 → 7 criterios). Agregar un nivel 6 es un `INSERT`, no una migración.

**Los criterios son nodos hoja evaluables.** En el Excel la fórmula `IFS()` está en las filas de criterio (a, b, c), no en los ítems numerados: los ítems numerados son agrupadores con `SUB TOTAL`. Por eso los 45 criterios se cargan como hijos de su ítem, con `es_evaluable = TRUE`.

**Nada del motor está en código.** Los valores de C/CP/IT/N/A, los 6 pesos, los umbrales 3.6 y 6.3, los cortes 60/70/80, el umbral de permiso sanitario y el máximo de NC Mayores viven todos en tablas.

**Persistencia histórica.** `respuesta_item.valor_aplicado` congela el valor vigente al responder. La prueba CP-05 lo demuestra: cambiar CP de 0.5 a 0.9 no altera una evaluación ya calculada.

**Triggers de integridad.** Los pesos no pueden sumar más de 1.00 · un ítem no puede ser su propio ancestro · una evaluación bloqueada rechaza cambios · un caso debe tener exactamente uno de los 4 orígenes.
