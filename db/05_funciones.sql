-- =====================================================================
-- Archivo 05 de 05 — Motor de riesgo: funciones y vistas
--
-- Cadena de cálculo:
--   Ficha BPM → % cumplimiento → Factor 3 (peso 0.56) → RE
--   RP = MAX(nivel de riesgo de las categorías que elabora)
--   RT = RP × RE  →  nivel de riesgo  →  frecuencia  →  próxima inspección
-- =====================================================================
SET search_path TO ebr, public;


-- ---------------------------------------------------------------------
-- Árbol de la ficha con ruta ordenada (sustituye las 4 tablas por nivel)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_arbol_ficha(p_version_ficha_id INT)
RETURNS TABLE (
    id INT, id_padre INT, numeracion VARCHAR, titulo TEXT,
    nivel SMALLINT, es_evaluable BOOLEAN, peso NUMERIC, ruta INT[]
) AS $$
    WITH RECURSIVE arbol AS (
        SELECT i.id, i.id_padre, i.numeracion, i.titulo, i.nivel,
               i.es_evaluable, i.peso, ARRAY[i.orden]::INT[] AS ruta
          FROM item_ficha i
         WHERE i.version_ficha_id = p_version_ficha_id
           AND i.id_padre IS NULL
           AND i.activo

        UNION ALL

        SELECT h.id, h.id_padre, h.numeracion, h.titulo, h.nivel,
               h.es_evaluable, h.peso, a.ruta || h.orden
          FROM item_ficha h
          JOIN arbol a ON h.id_padre = a.id
         WHERE h.activo
    )
    SELECT * FROM arbol ORDER BY ruta;
$$ LANGUAGE sql STABLE;


-- ---------------------------------------------------------------------
-- Subtotal de un ítem agrupador: suma de sus descendientes evaluables
-- Reemplaza las 33 filas SUB TOTAL del Excel
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_subtotal_item(p_evaluacion_id INT, p_item_id INT)
RETURNS TABLE (obtenido NUMERIC, posible NUMERIC, excluidos NUMERIC) AS $$
    WITH RECURSIVE desc_ AS (
        SELECT id FROM item_ficha WHERE id = p_item_id
        UNION ALL
        SELECT h.id FROM item_ficha h JOIN desc_ d ON h.id_padre = d.id
    )
    SELECT
        COALESCE(SUM(CASE WHEN NOT r.excluido_del_calculo
                          THEN r.valor_aplicado * r.peso_aplicado ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN NOT r.excluido_del_calculo
                          THEN r.peso_aplicado ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN r.excluido_del_calculo
                          THEN r.peso_aplicado ELSE 0 END), 0)
      FROM respuesta_item r
      JOIN desc_ d ON d.id = r.item_ficha_id
     WHERE r.evaluacion_id = p_evaluacion_id;
$$ LANGUAGE sql STABLE;


-- ---------------------------------------------------------------------
-- Porcentaje de cumplimiento
-- REGLA CLAVE: N/A no vale cero — sale del DENOMINADOR
--   % = puntos_obtenidos / (total_posible − puntos_excluidos_na)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcular_cumplimiento(p_evaluacion_id INT)
RETURNS TABLE (
    puntos_obtenidos NUMERIC, puntos_excluidos_na NUMERIC,
    puntaje_total_posible NUMERIC, denominador_efectivo NUMERIC,
    porcentaje NUMERIC, items_respondidos INT, items_na INT,
    nc_criticas INT, nc_mayores INT, nc_menores INT
) AS $$
    SELECT
        COALESCE(SUM(CASE WHEN NOT r.excluido_del_calculo
                          THEN r.valor_aplicado * r.peso_aplicado ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN r.excluido_del_calculo
                          THEN r.peso_aplicado ELSE 0 END), 0),
        COALESCE(SUM(r.peso_aplicado), 0),
        COALESCE(SUM(CASE WHEN NOT r.excluido_del_calculo
                          THEN r.peso_aplicado ELSE 0 END), 0),
        ROUND(
            COALESCE(SUM(CASE WHEN NOT r.excluido_del_calculo
                              THEN r.valor_aplicado * r.peso_aplicado ELSE 0 END), 0)
            / NULLIF(SUM(CASE WHEN NOT r.excluido_del_calculo
                              THEN r.peso_aplicado ELSE 0 END), 0) * 100
        , 2),
        COUNT(*)::INT,
        COUNT(*) FILTER (WHERE r.excluido_del_calculo)::INT,
        COUNT(*) FILTER (WHERE o.genera_nc AND c.codigo = 'C')::INT,
        COUNT(*) FILTER (WHERE o.genera_nc AND c.codigo = 'M')::INT,
        COUNT(*) FILTER (WHERE o.genera_nc AND c.codigo = 'Me')::INT
      FROM respuesta_item r
      JOIN opcion_respuesta o  ON o.id = r.opcion_respuesta_id
      LEFT JOIN nivel_criticidad c ON c.id = r.criticidad_id
     WHERE r.evaluacion_id = p_evaluacion_id;
$$ LANGUAGE sql STABLE;
COMMENT ON FUNCTION fn_calcular_cumplimiento IS
  'El NULLIF protege el caso extremo en que todos los criterios se marquen N/A (división por cero)';


-- ---------------------------------------------------------------------
-- Riesgo del Producto (RP) = MAX del nivel de riesgo de las categorías
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcular_rp(p_establecimiento_id INT)
RETURNS TABLE (rp_valor NUMERIC, subcategoria_id INT, nivel_riesgo_id SMALLINT) AS $$
    SELECT n.puntaje_rp, s.id, n.id
      FROM establecimiento_categoria ec
      JOIN subcategoria_alimento s ON s.id = ec.subcategoria_alimento_id
      JOIN nivel_riesgo n ON n.id = COALESCE(s.nivel_riesgo_resultante_id,
                                             s.nivel_riesgo_microbiologico_id)
     WHERE ec.establecimiento_id = p_establecimiento_id
       AND ec.activo
     ORDER BY n.puntaje_rp DESC, s.id
     LIMIT 1;
$$ LANGUAGE sql STABLE;


-- ---------------------------------------------------------------------
-- Determina la opción del factor automático 3 a partir del porcentaje
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_opcion_factor_bpm(p_version_matriz_id INT, p_porcentaje NUMERIC)
RETURNS INT AS $$
    SELECT o.id
      FROM opcion_factor o
      JOIN factor_riesgo_establecimiento f ON f.id = o.factor_id
     WHERE f.version_matriz_id = p_version_matriz_id
       AND f.es_automatico
       AND p_porcentaje >= o.limite_inf
       AND p_porcentaje <= o.limite_sup
     LIMIT 1;
$$ LANGUAGE sql STABLE;


-- ---------------------------------------------------------------------
-- Riesgo del Establecimiento (RE) = Σ (puntaje × peso)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcular_re(p_evaluacion_id INT)
RETURNS TABLE (re_valor NUMERIC, detalle JSONB) AS $$
    SELECT
        ROUND(COALESCE(SUM(efr.aporte), 0), 4),
        COALESCE(jsonb_agg(jsonb_build_object(
            'numero',  f.numero,
            'factor',  f.nombre,
            'opcion',  o.descripcion,
            'puntaje', efr.puntaje_aplicado,
            'peso',    efr.peso_aplicado,
            'aporte',  efr.aporte
        ) ORDER BY f.numero), '[]'::JSONB)
      FROM evaluacion_factor_riesgo efr
      JOIN factor_riesgo_establecimiento f ON f.id = efr.factor_id
      JOIN opcion_factor o ON o.id = efr.opcion_factor_id
     WHERE efr.evaluacion_id = p_evaluacion_id;
$$ LANGUAGE sql STABLE;


-- ---------------------------------------------------------------------
-- Cálculo completo. Escribe el snapshot en calculo_riesgo y, si procede,
-- genera la programación institucional de la próxima inspección.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_procesar_evaluacion(p_evaluacion_id INT)
RETURNS INT AS $$
DECLARE
    v_eval        evaluacion%ROWTYPE;
    v_vf          version_ficha%ROWTYPE;
    v_cum         RECORD;
    v_rp          RECORD;
    v_re          RECORD;
    v_rt          NUMERIC(8,4);
    v_rango       rango_frecuencia%ROWTYPE;
    v_calif       rango_calificacion%ROWTYPE;
    v_aprueba     BOOLEAN;
    v_texto       VARCHAR(200);
    v_opcion_bpm  INT;
    v_calculo_id  INT;
    v_proxima     DATE;
BEGIN
    SELECT * INTO v_eval FROM evaluacion WHERE id = p_evaluacion_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Evaluación % no existe', p_evaluacion_id; END IF;

    SELECT * INTO v_vf FROM version_ficha WHERE id = v_eval.version_ficha_id;

    -- 1) Cumplimiento
    SELECT * INTO v_cum FROM fn_calcular_cumplimiento(p_evaluacion_id);
    IF v_cum.denominador_efectivo IS NULL OR v_cum.denominador_efectivo = 0 THEN
        RAISE EXCEPTION 'Todos los criterios están marcados N/A: no hay denominador para calcular';
    END IF;

    -- 2) Factor 3 automático, derivado del porcentaje
    v_opcion_bpm := fn_opcion_factor_bpm(v_eval.version_matriz_id, v_cum.porcentaje);
    IF v_opcion_bpm IS NULL THEN
        RAISE EXCEPTION 'No hay opción de factor BPM para el porcentaje %', v_cum.porcentaje;
    END IF;

    INSERT INTO evaluacion_factor_riesgo (evaluacion_id, factor_id, opcion_factor_id,
                                          puntaje_aplicado, peso_aplicado, aporte)
    SELECT p_evaluacion_id, f.id, o.id, o.puntaje, f.peso, ROUND(o.puntaje * f.peso, 4)
      FROM opcion_factor o
      JOIN factor_riesgo_establecimiento f ON f.id = o.factor_id
     WHERE o.id = v_opcion_bpm
    ON CONFLICT (evaluacion_id, factor_id) DO UPDATE
       SET opcion_factor_id = EXCLUDED.opcion_factor_id,
           puntaje_aplicado = EXCLUDED.puntaje_aplicado,
           peso_aplicado    = EXCLUDED.peso_aplicado,
           aporte           = EXCLUDED.aporte;

    -- 3) RP y RE
    SELECT * INTO v_rp FROM fn_calcular_rp(v_eval.establecimiento_id);
    IF v_rp.rp_valor IS NULL THEN
        RAISE EXCEPTION 'El establecimiento % no tiene categorías de alimento con nivel de riesgo asignado',
                        v_eval.establecimiento_id;
    END IF;

    SELECT * INTO v_re FROM fn_calcular_re(p_evaluacion_id);

    -- 4) RT = RP × RE
    v_rt := ROUND(v_rp.rp_valor * v_re.re_valor, 4);

    SELECT * INTO v_rango
      FROM rango_frecuencia
     WHERE version_matriz_id = v_eval.version_matriz_id
       AND (v_rt > limite_inferior OR (incluye_inferior AND v_rt = limite_inferior))
       AND (limite_superior IS NULL OR v_rt < limite_superior
            OR (incluye_superior AND v_rt = limite_superior))
     ORDER BY orden LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RT % fuera de los rangos de frecuencia definidos', v_rt;
    END IF;

    -- 5) Calificación y regla de aprobación
    SELECT * INTO v_calif
      FROM rango_calificacion
     WHERE version_ficha_id = v_eval.version_ficha_id
       AND (v_cum.porcentaje > limite_inferior
            OR (incluye_inferior AND v_cum.porcentaje = limite_inferior))
       AND (v_cum.porcentaje < limite_superior
            OR (incluye_superior AND v_cum.porcentaje = limite_superior))
     ORDER BY orden LIMIT 1;

    IF v_cum.nc_criticas > v_vf.max_nc_criticas THEN
        v_aprueba := FALSE;
        v_texto   := 'No aprueba la inspección, corregir NC Críticas inmediatamente';
    ELSIF v_cum.porcentaje > v_vf.porcentaje_minimo_aprobacion
          AND v_cum.nc_mayores <= v_vf.max_nc_mayores THEN
        v_aprueba := TRUE;
        v_texto   := 'Aprueba la inspección';
    ELSE
        v_aprueba := FALSE;
        v_texto   := 'No se aprueba la inspección, presentar plan de corrección de NC';
    END IF;

    v_proxima := COALESCE(v_eval.fecha_finalizacion::DATE, CURRENT_DATE)
                 + (v_rango.meses_hasta_proxima || ' months')::INTERVAL;

    -- 6) Snapshot
    INSERT INTO calculo_riesgo (
        evaluacion_id, puntos_obtenidos, puntos_excluidos_na, puntaje_total_posible,
        denominador_efectivo, porcentaje_cumplimiento, items_respondidos, items_na,
        nc_criticas, nc_mayores, nc_menores, rango_calificacion_id, calificacion_texto,
        aprueba, otorga_permiso_sanitario, rp_valor, rp_subcategoria_id, rp_nivel_riesgo_id,
        re_valor, re_detalle, rt_valor, nivel_riesgo_id, rango_frecuencia_id, frecuencia,
        fecha_proxima_inspeccion, version_ficha_id, version_matriz_id)
    VALUES (
        p_evaluacion_id, v_cum.puntos_obtenidos, v_cum.puntos_excluidos_na,
        v_cum.puntaje_total_posible, v_cum.denominador_efectivo, v_cum.porcentaje,
        v_cum.items_respondidos, v_cum.items_na,
        v_cum.nc_criticas, v_cum.nc_mayores, v_cum.nc_menores,
        v_calif.id, v_texto, v_aprueba,
        (v_cum.porcentaje > v_vf.porcentaje_permiso_sanitario),
        v_rp.rp_valor, v_rp.subcategoria_id, v_rp.nivel_riesgo_id,
        v_re.re_valor, v_re.detalle, v_rt, v_rango.nivel_riesgo_id, v_rango.id,
        v_rango.frecuencia, v_proxima, v_eval.version_ficha_id, v_eval.version_matriz_id)
    ON CONFLICT (evaluacion_id) DO UPDATE SET
        puntos_obtenidos = EXCLUDED.puntos_obtenidos,
        porcentaje_cumplimiento = EXCLUDED.porcentaje_cumplimiento,
        re_valor = EXCLUDED.re_valor, re_detalle = EXCLUDED.re_detalle,
        rt_valor = EXCLUDED.rt_valor, frecuencia = EXCLUDED.frecuencia,
        fecha_proxima_inspeccion = EXCLUDED.fecha_proxima_inspeccion,
        fecha_calculo = NOW()
    RETURNING id INTO v_calculo_id;

    -- 7) Cierre del ciclo: programar la próxima inspección
    INSERT INTO programacion_institucional (establecimiento_id, evaluacion_origen_id,
                                            fecha_programada, frecuencia_aplicada,
                                            generada_automatica, prioridad, observaciones)
    VALUES (v_eval.establecimiento_id, p_evaluacion_id, v_proxima, v_rango.frecuencia, TRUE,
            CASE WHEN v_rango.frecuencia = 'Trimestral' THEN 'ALTA' ELSE 'NORMAL' END,
            'Generada automáticamente a partir del RT ' || v_rt || ' de la evaluación ' || v_eval.numero_evaluacion);

    RETURN v_calculo_id;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- Vistas de consulta
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_evaluacion_resumen AS
SELECT e.id, e.numero_evaluacion, emp.razon_social, est.nombre AS establecimiento,
       u.nombre_completo AS evaluador, es.nombre AS estado,
       c.porcentaje_cumplimiento, c.calificacion_texto, c.aprueba,
       c.rp_valor, c.re_valor, c.rt_valor, nr.nombre AS nivel_riesgo,
       c.frecuencia, c.fecha_proxima_inspeccion,
       c.nc_criticas, c.nc_mayores, c.nc_menores
  FROM evaluacion e
  JOIN establecimiento est ON est.id = e.establecimiento_id
  JOIN empresa emp         ON emp.id = est.empresa_id
  JOIN estado_evaluacion es ON es.id = e.estado_id
  LEFT JOIN usuario u       ON u.id = e.evaluador_id
  LEFT JOIN calculo_riesgo c ON c.evaluacion_id = e.id
  LEFT JOIN nivel_riesgo nr ON nr.id = c.nivel_riesgo_id;

-- Establecimientos con inspección vencida según la frecuencia calculada
CREATE OR REPLACE VIEW v_inspecciones_vencidas AS
SELECT est.id AS establecimiento_id, est.nombre, emp.razon_social,
       c.fecha_proxima_inspeccion, c.frecuencia, nr.nombre AS nivel_riesgo,
       (CURRENT_DATE - c.fecha_proxima_inspeccion) AS dias_vencida
  FROM calculo_riesgo c
  JOIN evaluacion e        ON e.id = c.evaluacion_id
  JOIN establecimiento est ON est.id = e.establecimiento_id
  JOIN empresa emp         ON emp.id = est.empresa_id
  JOIN nivel_riesgo nr     ON nr.id = c.nivel_riesgo_id
 WHERE c.fecha_proxima_inspeccion < CURRENT_DATE
   AND c.id = (SELECT MAX(c2.id) FROM calculo_riesgo c2
                 JOIN evaluacion e2 ON e2.id = c2.evaluacion_id
                WHERE e2.establecimiento_id = est.id);

-- Subcategorías con datos incompletos en el archivo fuente (defectos D-03 y D-06)
CREATE OR REPLACE VIEW v_catalogo_incompleto AS
SELECT s.id, c.nombre AS categoria, s.nombre AS subcategoria, s.nota_revision
  FROM subcategoria_alimento s
  JOIN categoria_alimento c ON c.id = s.categoria_id
 WHERE s.requiere_revision;
