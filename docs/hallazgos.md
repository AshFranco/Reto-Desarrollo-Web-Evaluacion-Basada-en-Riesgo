# Hallazgos en los archivos fuente

Documento de observaciones para la DIGEMAPS. Los defectos D-01 a D-06 son
errores reales en los archivos entregados, no interpretaciones del equipo.

## Defectos

| ID | Archivo | Defecto | Manejo en el sistema |
|---|---|---|---|
| **D-01** | Hoja Frecuencia Inspección | El factor 6 devuelve `FALSE`. La celda dice *"Plan de muestreo en materias primas"* y la fórmula compara contra *"Tiene plan de muestreo microbiológico solo para las materias primas"*. Ninguna condición coincide. **El RE del ejemplo (1.2067) está mal calculado**; el valor correcto es 1.3931 | Imposible por diseño: `opcion_factor` con clave foránea |
| **D-02** | Matriz Riesgo Alimentos | Filas con `#N/A` propagado | Rechazadas en la importación, registradas en `importacion_detalle` |
| **D-03** | Matriz Riesgo Alimentos | 5 subcategorías sin nivel de riesgo (3 de Frutas y Hortalizas, 2 de Cereales) | `requiere_revision = TRUE` + vista `v_catalogo_incompleto` |
| **D-04** | Ficha Inspección BPM | La columna de criticidad (C/M/Me) está **vacía en los 45 criterios**, pero la regla de aprobación depende de ella | `item_ficha.id_criticidad` nullable; se asigna desde el ABM de catálogo |
| **D-05** | Ficha Inspección BPM | La jerarquía está codificada en la columna donde se escribió el texto y en la cadena de numeración, no como dato | Resuelto con `item_ficha.id_padre` auto-referenciada |
| **D-06** | Matriz Riesgo Alimentos | *Alimentos preparados* aparece como categoría con riesgo BAJO pero **sin ninguna subcategoría** (fila 102) | Se crea subcategoría homónima marcada para revisión |

## Ambigüedades pendientes

| ID | Pregunta | Estado |
|---|---|---|
| **A-01** | La matriz de alimentos produce un riesgo total en escala 2–8, pero la hoja de frecuencia consume Bajo=1/Medio=2/Alto=3. ¿Cuál es la regla de conversión? | **BLOQUEANTE.** Supuesto cargado en `rango_nivel_riesgo` con `es_supuesto = TRUE` |
| **A-02** | ¿Quién asigna la criticidad Crítica/Mayor/Menor a los 45 criterios? ¿Es fija por criterio o la decide el inspector? | **BLOQUEANTE.** Determina si es catálogo o dato de la evaluación |
| **A-03** | El riesgo químico está vacío en 108 de 110 subcategorías. ¿Es opcional o falta completarlo? | Se asume opcional; el promedio se calcula sobre los valores disponibles |
| **A-04** | Todos los criterios valen 1 punto. ¿Habrá pesos diferenciados? | `item_ficha.peso` existe y hoy vale 1.00 en todos |
| **A-05** | ¿La importación de Excel es carga inicial única o función permanente? | Implementada como función permanente |
| **A-06** | ¿La respuesta se marca a nivel del ítem numerado o de cada criterio? | **RESUELTO por el Excel:** la fórmula `IFS()` está en las filas de criterio. Son 45 criterios evaluables bajo 45 ítems agrupadores |
| **A-07** | ¿El permiso sanitario (>81%) depende de aprobar la inspección? | Se asume que sí. Documentado en `evaluarAprobacion()` |

## Discrepancias entre el SRS y los Excel

| El SRS dice | Los Excel dicen | Resolución |
|---|---|---|
| RF-13: secciones "Instalaciones, Equipos, Personal, Higiene, Producción, Almacenamiento, Transporte, Control de Calidad" | 7 secciones con otros nombres | **Manda el Excel** |
| RF-13: respuestas "Cumple / No Cumple / No Aplica" (3 opciones) | **C / CP / IT / N/A** (4 opciones) | **Manda el Excel.** Falta "Cumplimiento parcial" en el SRS |
| RF-14: calcula "puntaje, % de cumplimiento, nivel de riesgo" | El nivel de riesgo requiere `RT = RP × RE`, que el SRS nunca menciona | **Manda el Excel.** El SRS omite el grueso del motor |
| RF-14: matriz de frecuencia 1.0-3.6 / >3.6-6.3 / >6.3 | Idéntico | Coincide |

**Regla del proyecto: ante conflicto, mandan los Excel.** Son la fuente operativa real.

## Observación sobre precisión numérica

Un modelo que almacene el aporte de cada factor en `numeric(6,2)` clasifica mal el
establecimiento. Verificado sobre las 12.288 combinaciones posibles de los 6 factores
× 3 valores de RP: **en 31 casos la frecuencia resultante es incorrecta.**

Ejemplo: factores [1.00, 1.00, 1.00, 1.00, 1.67, 3.00] con RP = 3

- RT exacto: **3.6006** → Semestral
- RT con dos decimales: **3.6000** → Anual (incorrecto)

El sesgo va siempre hacia inspeccionar menos de lo que corresponde. La causa es que
2.33 × 0.08 = 0.1864, que a dos decimales es 0.19; seis redondeos acumulados desplazan
el RE lo suficiente para cruzar el umbral de 3.6.

Por eso el esquema usa `numeric(8,4)` en `aporte`, `re_valor` y `rt_valor`, y el motor
en TypeScript acumula con `decimal.js` redondeando una sola vez al final.
