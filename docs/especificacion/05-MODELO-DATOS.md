# 05 - Modelo de Datos

## 1. Objetivo

Documentar el modelo de datos del sistema EBR/BPM. A diferencia de un modelo conceptual propuesto, este ya tiene **esquema físico implementado y poblado** en `db/01_schema.sql` (esquema PostgreSQL `ebr`, 51 tablas) — se documenta como fuente de verdad verificada, no como propuesta.

> **Advertencia activa:** existe un segundo esquema (`apps/api/prisma/schema.prisma`, 48 modelos, en `main` desde PR #1) que se declara "convertido fielmente" desde este DBML oficial pero que en realidad diverge en 3 tablas. Este documento describe el esquema de `db/01_schema.sql` como el oficial. Ver §6 para el detalle exacto de la divergencia.

## 2. Módulos y entidades

### Módulo 1 — Seguridad
- **rol** (código, nombre, es_interno)
- **permiso** (código, módulo)
- **rol_permiso** (M:N)
- **usuario** (uuid_local, documento_identidad, correo único, hash_password, empresa_id, estado: Pendiente Validación / Aprobado / Rechazado / Inactivo, carta_autorizacion_id → documento, doble_factor_activo, secreto_2fa, intentos_fallidos, bloqueado_hasta)
- **usuario_rol** (M:N)
- **refresh_token** (token_hash, expira_en, revocado)

### Módulo 2 — Geografía
- **provincia**
- **municipio** (→ provincia)
- **dps_das** (tipo: DPS/DAS, → provincia)

### Módulo 3 — Empresa
- **actividad_economica**
- **empresa** (RNC único, → municipio, → actividad_economica)
- **establecimiento** (→ empresa, → municipio, → dps_das, número de permiso sanitario, producción anual, empleados por sexo, latitud/longitud)
- **tipo_contacto**
- **contacto** (restricción: pertenece a empresa *o* a establecimiento, nunca a ambos ni a ninguno)

### Módulo 4 — Catálogo de riesgo
- **nivel_riesgo** (código Bajo/Medio/Alto, puntaje_matriz 2/4/8, puntaje_rp 1/2/3 — reconcilia las dos escalas del dominio)
- **categoria_alimento**
- **subcategoria_alimento** (→ categoría, → nivel de riesgo microbiológico/químico/resultante, requiere_revision)
- **establecimiento_categoria** (M:N — qué categorías elabora cada establecimiento)
- **version_matriz_riesgo** (estado Borrador/Publicada/Archivada, índice único parcial: solo una Publicada a la vez)
- **factor_riesgo_establecimiento** (número, peso con CHECK 0<peso≤1, es_automatico)
- **opcion_factor** (puntaje CHECK 1–3, límites inferior/superior solo para factores automáticos)
- **rango_frecuencia** (límites, si incluyen el borde, meses hasta la próxima inspección)
- **rango_nivel_riesgo** (incluye la columna `es_supuesto` — marca los valores de A-01 como no confirmados por fuente oficial)

### Módulo 5 — Ficha BPM
- **version_ficha** (porcentaje_minimo_aprobacion=60, max_nc_criticas=1, max_nc_mayores=5, porcentaje_permiso_sanitario=81 — todos datos parametrizados, no constantes)
- **nivel_criticidad** (Crítico / Mayor / Menor)
- **item_ficha** (auto-referenciada vía id_padre para la jerarquía, con CTE recursiva para navegarla; CHECK que impide que un ítem sea su propio padre; peso; criticidad_id nullable — ver A-02)
- **literal_item** (sub-literales a/b/c dentro de un criterio, con texto guía)
- **opcion_respuesta** (código C/CP/IT/N-A, valor numérico, excluye_del_calculo)
- **rango_calificacion**

### Módulo 6 — Origen de casos
- **origen_caso**
- **solicitud_bpm** (estado: Borrador/Pendiente Asignación/Asignada/Rechazada/Cerrada)
- **alerta_lapch** (resultado: Procede/No Procede)
- **denuncia** (resultado: Procede/No Procede/Remisión, es_anonima)
- **programacion_institucional** (cierra el ciclo — la próxima inspección programada según la frecuencia calculada)
- **caso** (CHECK: exactamente uno de los cuatro orígenes debe estar presente — nunca cero, nunca más de uno)

### Módulo 7 — Evaluación y cálculo
- **estado_evaluacion** (11 estados, marca cuáles son finales y cuáles bloquean edición de datos)
- **evaluacion** (uuid_local, version_registro para control de concurrencia optimista, bloqueada)
- **asignacion_evaluador**
- **historial_estado**
- **respuesta_item** (valor_aplicado congelado en el momento de la respuesta, único por evaluación+ítem)
- **evidencia** (tipo Foto/Documento/Video, hash_sha256 para integridad)
- **medida_correctiva** (sin límite artificial de cantidad)
- **evaluacion_participante**
- **evaluacion_factor_riesgo** (snapshot histórico *por evaluación*, no por establecimiento — deliberado, ver §5)
- **calculo_riesgo** (snapshot inmutable completo: cumplimiento, no conformidades, RP, RE con detalle en JSONB, RT, frecuencia resultante, fecha de la próxima inspección)

### Módulo 8 — Soporte
- **documento**
- **notificacion**
- **auditoria** (acción: Insert/Update/Delete/Login/Logout/Download/Sync/Import)
- **operacion_pendiente** (cola de sincronización offline, idempotente vía uuid_local)
- **importacion_excel**
- **importacion_detalle**

## 3. Relaciones principales

```text
empresa 1 --- N establecimiento
empresa 1 --- N usuario
establecimiento N --- N categoria_alimento (vía establecimiento_categoria)

usuario N --- N rol (vía usuario_rol)
rol N --- N permiso (vía rol_permiso)

item_ficha 1 --- N item_ficha (auto-referencia: jerarquía de la ficha BPM)
item_ficha 1 --- N literal_item
item_ficha N --- 1 nivel_criticidad (nullable — A-02)

caso 0..1 --- 1 solicitud_bpm
caso 0..1 --- 1 alerta_lapch
caso 0..1 --- 1 denuncia
caso 0..1 --- 1 programacion_institucional
   (CHECK: exactamente una de las cuatro FKs no nula)

caso 1 --- N evaluacion
evaluacion 1 --- N respuesta_item
evaluacion 1 --- N evidencia
evaluacion 1 --- N evaluacion_factor_riesgo
evaluacion 1 --- 1 calculo_riesgo   (relación 1:1, única por evaluación)

calculo_riesgo -----> programacion_institucional
   (el resultado de una evaluación alimenta la siguiente programación — el ciclo)
```

## 4. Restricciones de integridad implementadas

- `usuario.correo` único.
- `empresa.rnc` único.
- Exactamente un origen por `caso` (CHECK).
- `respuesta_item` único por combinación evaluación + ítem de ficha.
- `contacto`: pertenece a empresa *o* establecimiento, nunca ambos ni ninguno (CHECK).
- Solo una `version_ficha` y una `version_matriz_riesgo` pueden estar en estado Publicada a la vez (índices únicos parciales).
- Trigger `trg_validar_pesos`: la suma de pesos de los 6 factores de riesgo por versión no puede exceder 1.00.
- Trigger `trg_validar_ciclo`: impide ciclos en `item_ficha.id_padre` (máximo 20 saltos de profundidad).
- Trigger `trg_eval_bloqueada`: una evaluación con `bloqueada=TRUE` rechaza cualquier INSERT/UPDATE/DELETE sobre sus `respuesta_item`.

## 5. Decisiones de modelado y su justificación

- **Desnormalización deliberada para integridad histórica:** `calculo_riesgo.frecuencia` y `evaluacion_factor_riesgo.puntaje_aplicado`/`peso_aplicado` son snapshots congelados en el momento de la evaluación. Si la versión del catálogo cambia después (por ejemplo, se ajusta un peso), las evaluaciones ya calculadas no se alteran silenciosamente.
- **Referencial en vez de polimórfico:** `caso` usa cuatro columnas FK nullables con un CHECK de "exactamente una", en vez de un patrón polimórfico genérico. Mantiene la integridad referencial nativa de PostgreSQL a costa de cuatro columnas casi siempre vacías — decisión consciente, documentada en `db/opcional/07_ajustes_modelo_equipo.sql`.
- **Precisión numérica ampliada:** `numeric(8,4)` en vez de `numeric(6,2)` para `aporte`, `re_valor` y `rt_valor`. Con solo 2 decimales, 31 de 12.288 combinaciones posibles de puntajes clasifican mal la frecuencia de inspección (`docs/hallazgos.md`).
- **Idempotencia offline:** todo objeto mutable capturable en campo (`evaluacion`, `respuesta_item`, `evidencia`) lleva `uuid_local` generado en el cliente, más `operacion_pendiente` como cola. Esto es infraestructura preparada para RNF-01, utilizada activamente por el cliente PWA actual.
- **Item_ficha auto-referenciada con CTE recursiva** en vez de niveles fijos (sección → criterio → sub-criterio como tablas separadas), porque la ficha original tiene una profundidad variable de hasta 5 niveles.

## 6. Divergencia con `apps/api/prisma/schema.prisma` (rama sin fusionar)

Verificado modelo por modelo contra `db/01_schema.sql`:

**Tablas del esquema oficial que faltan en Prisma:** `actividad_economica`, `literal_item`, `evaluacion_participante`, `documento`, `importacion_excel`, `importacion_detalle` (6 tablas).

**Modelos en Prisma que no existen en el esquema oficial:**
- `RefreshToken` — señalado explícitamente en el propio schema como "extensión al DBML original... hay que incorporarla formalmente al esquema oficial". Es razonable y probablemente deba adoptarse en `db/01_schema.sql`.
- `InformeEvaluacion` y `Expediente` — tablas nuevas, no documentadas ni en `db/01_schema.sql` ni en la versión previa de este documento.

**Otras discrepancias verificadas:**
- Los 7 estados de evaluación sembrados por el `seed.ts` de Prisma no coinciden con los 11 estados sembrados por `db/02_seed_catalogos.sql`.
- El modelo M:N `rol_permiso` existe en ambos esquemas, pero el código de autenticación de la rama Prisma lo colapsa en la práctica a "un solo rol principal por usuario" mediante una lista de prioridad fija en código — la granularidad M:N del modelo no se usa realmente hoy.
- Existe además una migración Prisma ya generada (968 líneas de SQL autogenerado) que constituye una **tercera fuente de DDL**, independiente de `db/01_schema.sql` y no sincronizada con ella.

**Recomendación:** tratar `db/01_schema.sql` como fuente de verdad única y regenerar `schema.prisma` desde ahí (no al revés), incorporando `RefreshToken` de forma oficial y decidiendo explícitamente si `InformeEvaluacion`/`Expediente` se adoptan o se descartan. Ver `12-PLANIFICACION.md` §2.

## 7. Seed data — dos fuentes independientes sin sincronizar

- `db/02_seed_catalogos.sql`, `03_seed_ficha_bpm.sql`, `04_seed_matriz_alimentos.sql`: la fuente "oficial", generada programáticamente desde los tres Excel de DIGEMAPS (`openpyxl`), con verificación de conteo (`RAISE EXCEPTION` si no cuadra): 5 roles, 20 permisos, 6 factores con 24 opciones, 90 nodos de ficha (45 evaluables), 17 categorías y 111 subcategorías de alimento.
- `apps/api/prisma/seed-data/*.json` (rama sin fusionar): extracción **independiente** de los mismos tres Excel, hecha por separado. Existe una discrepancia de conteo sin resolver entre la documentación de esa rama ("~105 categorías") y la fuente oficial (17 categorías, 111 subcategorías) — no está claro si se refiere a subcategorías o a un conteo distinto, y debe reconciliarse antes de tratar cualquiera de las dos fuentes como definitiva.

## 8. Pendientes antes de dar el modelo por cerrado

- Resolver A-01 (regla de conversión de escala 2–8 → Bajo/Medio/Alto) con DIGEMAPS.
- Resolver A-02 (criterio de asignación de criticidad C/M/Me a los 45 ítems) con DIGEMAPS.
- Reconciliar `schema.prisma` contra `db/01_schema.sql`.
- Formalizar `RefreshToken` en el esquema oficial.
- Decidir si `InformeEvaluacion`/`Expediente` se incorporan al esquema oficial o se descartan.
- Reconciliar las dos fuentes de seed data.
