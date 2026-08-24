-- =====================================================================
-- Archivo 06 — Pruebas del motor de riesgo
-- Ejecutar después de 01 a 05. Es idempotente: limpia sus propios datos.
-- =====================================================================
SET search_path TO ebr, public;

BEGIN;

-- ---------------------------------------------------------------------
-- Datos mínimos de prueba
-- ---------------------------------------------------------------------
INSERT INTO provincia (codigo, nombre) VALUES ('01','Distrito Nacional') ON CONFLICT DO NOTHING;
INSERT INTO municipio (provincia_id, codigo, nombre)
SELECT id, '0101', 'Santo Domingo de Guzmán' FROM provincia WHERE codigo='01' ON CONFLICT DO NOTHING;

INSERT INTO usuario (nombre_completo, documento_identidad, correo, hash_password, estado)
VALUES ('Técnico de Prueba', '00100000001', 'tecnico.prueba@msp.gob.do', 'x', 'APROBADO')
ON CONFLICT (correo) DO NOTHING;

INSERT INTO empresa (razon_social, rnc, municipio_id)
SELECT 'Alimentos de Prueba SRL', '130000001', m.id FROM municipio m WHERE m.codigo='0101'
ON CONFLICT (rnc) DO NOTHING;

INSERT INTO establecimiento (empresa_id, nombre, municipio_id)
SELECT e.id, 'Planta Piloto de Prueba', m.id
  FROM empresa e, municipio m WHERE e.rnc='130000001' AND m.codigo='0101';

-- El establecimiento elabora un producto de riesgo ALTO -> RP = 3
INSERT INTO establecimiento_categoria (establecimiento_id, subcategoria_alimento_id)
SELECT est.id, s.id
  FROM establecimiento est,
       (SELECT id FROM subcategoria_alimento
         WHERE nivel_riesgo_microbiologico_id = (SELECT id FROM nivel_riesgo WHERE codigo='ALTO')
         ORDER BY id LIMIT 1) s
 WHERE est.nombre = 'Planta Piloto de Prueba';


-- ---------------------------------------------------------------------
-- Procedimiento auxiliar: crea una evaluación y responde los 45 criterios
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pruebas_crear_evaluacion(
    p_numero VARCHAR, p_c INT, p_cp INT, p_it INT, p_na INT
) RETURNS INT AS $$
DECLARE
    v_est INT; v_usr INT; v_vf INT; v_vm INT; v_caso INT; v_eval INT;
    v_prog INT; v_i INT := 0;
    r RECORD;
BEGIN
    SELECT id INTO v_est FROM establecimiento WHERE nombre='Planta Piloto de Prueba';
    SELECT id INTO v_usr FROM usuario WHERE correo='tecnico.prueba@msp.gob.do';
    SELECT id INTO v_vf  FROM version_ficha WHERE estado='PUBLICADA';
    SELECT id INTO v_vm  FROM version_matriz_riesgo WHERE estado='PUBLICADA';

    INSERT INTO programacion_institucional (establecimiento_id, fecha_programada, frecuencia_aplicada, generada_automatica)
    VALUES (v_est, CURRENT_DATE, 'Anual', FALSE) RETURNING id INTO v_prog;

    INSERT INTO caso (numero_caso, origen_caso_id, establecimiento_id, programacion_institucional_id)
    SELECT 'CASO-'||p_numero, o.id, v_est, v_prog FROM origen_caso o WHERE o.codigo='PROGRAMACION_INST'
    RETURNING id INTO v_caso;

    INSERT INTO evaluacion (uuid_local, numero_evaluacion, caso_id, establecimiento_id, evaluador_id,
                            version_ficha_id, version_matriz_id, estado_id, fecha_finalizacion)
    SELECT gen_random_uuid(), p_numero, v_caso, v_est, v_usr, v_vf, v_vm, e.id, NOW()
      FROM estado_evaluacion e WHERE e.codigo='EN_EJECUCION'
    RETURNING id INTO v_eval;

    -- Responde los criterios evaluables en el orden C, CP, IT, N/A
    FOR r IN SELECT id, peso FROM item_ficha
              WHERE version_ficha_id=v_vf AND es_evaluable ORDER BY orden LOOP
        v_i := v_i + 1;
        INSERT INTO respuesta_item (uuid_local, evaluacion_id, item_ficha_id, opcion_respuesta_id,
                                    valor_aplicado, peso_aplicado, excluido_del_calculo, criticidad_id)
        SELECT gen_random_uuid(), v_eval, r.id, o.id, o.valor, r.peso, o.excluye_del_calculo,
               (SELECT id FROM nivel_criticidad WHERE codigo='M')
          FROM opcion_respuesta o
         WHERE o.version_ficha_id = v_vf
           AND o.codigo = CASE
                WHEN v_i <= p_c                     THEN 'C'
                WHEN v_i <= p_c + p_cp              THEN 'CP'
                WHEN v_i <= p_c + p_cp + p_it       THEN 'IT'
                ELSE 'N/A' END;
    END LOOP;

    -- Los 5 factores manuales (el 3 lo calcula el motor)
    INSERT INTO evaluacion_factor_riesgo (evaluacion_id, factor_id, opcion_factor_id,
                                          puntaje_aplicado, peso_aplicado, aporte)
    SELECT v_eval, f.id, o.id, o.puntaje, f.peso, ROUND(o.puntaje*f.peso,4)
      FROM factor_riesgo_establecimiento f
      JOIN LATERAL (SELECT * FROM opcion_factor of2
                     WHERE of2.factor_id=f.id ORDER BY of2.orden DESC LIMIT 1) o ON TRUE
     WHERE f.version_matriz_id = v_vm AND NOT f.es_automatico;

    RETURN v_eval;
END; $$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- CASOS DE PRUEBA
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_total SMALLINT;
    v_eval INT; v_calc RECORD; v_fallos INT := 0;
BEGIN
    SELECT total_items_evaluables INTO v_total FROM version_ficha WHERE estado='PUBLICADA';
    RAISE NOTICE '--- Criterios evaluables en la ficha publicada: % ---', v_total;

    -- CP-01: todos C  -> 100%
    v_eval := pruebas_crear_evaluacion('TEST-01', v_total, 0, 0, 0);
    PERFORM fn_procesar_evaluacion(v_eval);
    SELECT * INTO v_calc FROM calculo_riesgo WHERE evaluacion_id=v_eval;
    RAISE NOTICE 'CP-01 Todos C      -> %%: %  | RE: % | RT: % | %',
        v_calc.porcentaje_cumplimiento, v_calc.re_valor, v_calc.rt_valor, v_calc.frecuencia;
    IF v_calc.porcentaje_cumplimiento <> 100.00 THEN v_fallos:=v_fallos+1;
       RAISE WARNING 'CP-01 FALLA: se esperaba 100.00'; END IF;

    -- CP-02: todos IT -> 0%
    v_eval := pruebas_crear_evaluacion('TEST-02', 0, 0, v_total, 0);
    PERFORM fn_procesar_evaluacion(v_eval);
    SELECT * INTO v_calc FROM calculo_riesgo WHERE evaluacion_id=v_eval;
    RAISE NOTICE 'CP-02 Todos IT     -> %%: % | aprueba: % | %',
        v_calc.porcentaje_cumplimiento, v_calc.aprueba, v_calc.calificacion_texto;
    IF v_calc.porcentaje_cumplimiento <> 0.00 OR v_calc.aprueba THEN v_fallos:=v_fallos+1;
       RAISE WARNING 'CP-02 FALLA'; END IF;

    -- CP-03: todos CP -> 50%
    v_eval := pruebas_crear_evaluacion('TEST-03', 0, v_total, 0, 0);
    PERFORM fn_procesar_evaluacion(v_eval);
    SELECT * INTO v_calc FROM calculo_riesgo WHERE evaluacion_id=v_eval;
    RAISE NOTICE 'CP-03 Todos CP     -> %%: %', v_calc.porcentaje_cumplimiento;
    IF v_calc.porcentaje_cumplimiento <> 50.00 THEN v_fallos:=v_fallos+1;
       RAISE WARNING 'CP-03 FALLA: se esperaba 50.00'; END IF;

    -- CP-04: N/A sale del denominador. 35 C + 10 N/A -> 100%, no 77.78%
    v_eval := pruebas_crear_evaluacion('TEST-04', v_total-10, 0, 0, 10);
    PERFORM fn_procesar_evaluacion(v_eval);
    SELECT * INTO v_calc FROM calculo_riesgo WHERE evaluacion_id=v_eval;
    RAISE NOTICE 'CP-04 % C + 10 N/A -> %%: % | denominador: % (debe ser %)',
        v_total-10, v_calc.porcentaje_cumplimiento, v_calc.denominador_efectivo, v_total-10;
    IF v_calc.porcentaje_cumplimiento <> 100.00 THEN v_fallos:=v_fallos+1;
       RAISE WARNING 'CP-04 FALLA: el N/A no salió del denominador'; END IF;

    -- CP-05: persistencia histórica. Cambiar el valor de CP no altera lo ya calculado
    UPDATE opcion_respuesta SET valor = 0.90
     WHERE codigo='CP' AND version_ficha_id=(SELECT id FROM version_ficha WHERE estado='PUBLICADA');
    SELECT * INTO v_calc FROM calculo_riesgo
     WHERE evaluacion_id=(SELECT id FROM evaluacion WHERE numero_evaluacion='TEST-03');
    RAISE NOTICE 'CP-05 Tras cambiar CP de 0.5 a 0.9, TEST-03 sigue en %%: %',
        v_calc.porcentaje_cumplimiento;
    IF v_calc.porcentaje_cumplimiento <> 50.00 THEN v_fallos:=v_fallos+1;
       RAISE WARNING 'CP-05 FALLA: el histórico cambió'; END IF;
    UPDATE opcion_respuesta SET valor = 0.50
     WHERE codigo='CP' AND version_ficha_id=(SELECT id FROM version_ficha WHERE estado='PUBLICADA');

    -- CP-06: la evaluación bloqueada rechaza cambios
    BEGIN
        UPDATE evaluacion SET bloqueada=TRUE WHERE numero_evaluacion='TEST-01';
        UPDATE respuesta_item SET observacion='intento'
         WHERE evaluacion_id=(SELECT id FROM evaluacion WHERE numero_evaluacion='TEST-01');
        v_fallos:=v_fallos+1;
        RAISE WARNING 'CP-06 FALLA: se permitió modificar una evaluación bloqueada';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'CP-06 Evaluación bloqueada rechaza cambios: correcto';
    END;

    -- CP-07: el ciclo se cierra generando la próxima programación
    IF (SELECT COUNT(*) FROM programacion_institucional WHERE generada_automatica) = 0 THEN
        v_fallos:=v_fallos+1; RAISE WARNING 'CP-07 FALLA: no se generó programación automática';
    ELSE
        RAISE NOTICE 'CP-07 Programaciones automáticas generadas: %',
            (SELECT COUNT(*) FROM programacion_institucional WHERE generada_automatica);
    END IF;

    RAISE NOTICE '=====================================================';
    IF v_fallos = 0 THEN RAISE NOTICE 'TODAS LAS PRUEBAS PASARON';
    ELSE RAISE EXCEPTION '% prueba(s) fallaron', v_fallos; END IF;
END $$;


-- ---------------------------------------------------------------------
-- Pruebas de integridad que DEBEN fallar
-- ---------------------------------------------------------------------
DO $$ BEGIN
    BEGIN
        UPDATE factor_riesgo_establecimiento SET peso = 0.90 WHERE numero = 1;
        RAISE WARNING 'INTEGRIDAD FALLA: se permitió que los pesos sumen más de 1.00';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Integridad OK: el trigger rechazó pesos que suman más de 1.00';
    END;

    BEGIN
        INSERT INTO caso (numero_caso, origen_caso_id, establecimiento_id)
        SELECT 'CASO-SIN-ORIGEN', o.id, e.id
          FROM origen_caso o, establecimiento e
         WHERE o.codigo='DENUNCIA' AND e.nombre='Planta Piloto de Prueba' LIMIT 1;
        RAISE WARNING 'INTEGRIDAD FALLA: se permitió un caso sin origen';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Integridad OK: se rechazó un caso sin ninguno de los 4 orígenes';
    END;
END $$;

ROLLBACK;   -- las pruebas no dejan rastro. Cambiar a COMMIT para inspeccionar los datos.
