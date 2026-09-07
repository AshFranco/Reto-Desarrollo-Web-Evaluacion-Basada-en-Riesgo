-- =====================================================================
-- Archivo 02 de 05 — Seed: catálogos base, roles, factores y frecuencias
-- Fuente de factores y rangos:
--   Hoja_de_Cálculo_Categorización_Establecimiento_y_Frecuencia_de_Inspección.xlsx
-- =====================================================================
SET search_path TO ebr, public;


-- ---------------------------------------------------------------------
-- Roles (SRS §2)
-- ---------------------------------------------------------------------
INSERT INTO rol (codigo, nombre, descripcion, es_interno) VALUES
  ('ADMINISTRADOR',       'Administrador',          'Configura catálogos, parámetros y usuarios',      TRUE),
  ('ADMIN_EMPRESA',       'Administrador Empresa',  'Gestiona las solicitudes de su empresa',          FALSE),
  ('USUARIO_DELEGADO',    'Usuario Delegado',       'Actúa en representación de la empresa',           FALSE),
  ('COORDINADOR',         'Coordinador',            'Asigna evaluaciones y revisa informes',           TRUE),
  ('TECNICO_EVALUADOR',   'Técnico Evaluador',      'Realiza evaluaciones e inspecciones en campo',    TRUE);


-- ---------------------------------------------------------------------
-- Niveles de riesgo (BAJO/MEDIO/ALTO). Se siembra AQUÍ, antes que
-- rango_frecuencia y rango_nivel_riesgo (más abajo en este mismo
-- archivo), porque ambos hacen JOIN contra nivel_riesgo.codigo. Antes
-- vivía en 04_seed_matriz_alimentos.sql, que corre DESPUÉS de este
-- archivo -- el JOIN contra una tabla todavía vacía no daba error,
-- simplemente insertaba 0 filas en silencio, dejando rango_frecuencia
-- y rango_nivel_riesgo completamente vacías (bug real, no defecto de
-- version_matriz_id: ver discusión en el PR de CI).
--
-- Reconcilia las dos escalas del dominio:
--   puntaje_matriz  (2/4/8) — Matriz de Riesgo de Alimentos, fórmula IFS col. D
--   puntaje_rp      (1/2/3) — Hoja Frecuencia Inspección, filas 14-16
-- ---------------------------------------------------------------------
INSERT INTO nivel_riesgo (codigo, nombre, puntaje_matriz, puntaje_rp, color_hex, orden) VALUES
  ('BAJO',  'Riesgo bajo',  2.00, 1.00, '#2E7D32', 1),
  ('MEDIO', 'Riesgo medio', 4.00, 2.00, '#F9A825', 2),
  ('ALTO',  'Riesgo alto',  8.00, 3.00, '#C62828', 3);


-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
INSERT INTO permiso (codigo, modulo, nombre) VALUES
  ('catalogo.ver',            'CATALOGO',   'Consultar catálogos'),
  ('catalogo.editar',         'CATALOGO',   'Editar catálogos y versiones'),
  ('catalogo.publicar',       'CATALOGO',   'Publicar una versión de catálogo'),
  ('catalogo.importar',       'CATALOGO',   'Importar archivos Excel'),
  ('usuario.ver',             'SEGURIDAD',  'Consultar usuarios'),
  ('usuario.administrar',     'SEGURIDAD',  'Crear, editar y validar usuarios'),
  ('empresa.ver',             'EMPRESA',    'Consultar empresas y establecimientos'),
  ('empresa.editar',          'EMPRESA',    'Registrar y editar empresas y establecimientos'),
  ('solicitud.crear',         'CASO',       'Crear solicitudes BPM'),
  ('solicitud.ver_propias',   'CASO',       'Consultar las solicitudes de su empresa'),
  ('caso.ver',                'CASO',       'Consultar todos los casos'),
  ('caso.gestionar',          'CASO',       'Registrar alertas LAPCH, denuncias y programaciones'),
  ('evaluacion.asignar',      'EVALUACION', 'Asignar y reasignar evaluadores'),
  ('evaluacion.ejecutar',     'EVALUACION', 'Ejecutar evaluaciones en campo'),
  ('evaluacion.revisar',      'EVALUACION', 'Aprobar, devolver o solicitar corrección'),
  ('evaluacion.cerrar',       'EVALUACION', 'Cerrar expedientes'),
  ('informe.generar',         'INFORME',    'Generar informes de evaluación'),
  ('informe.descargar',       'INFORME',    'Descargar informes en PDF'),
  ('reporte.ver',             'REPORTE',    'Consultar tableros y reportes'),
  ('auditoria.ver',           'AUDITORIA',  'Consultar la bitácora de auditoría');

-- Asignación rol → permiso
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p WHERE r.codigo = 'ADMINISTRADOR';

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
 WHERE r.codigo = 'COORDINADOR'
   AND p.codigo IN ('catalogo.ver','empresa.ver','empresa.editar','caso.ver','caso.gestionar',
                    'evaluacion.asignar','evaluacion.revisar','evaluacion.cerrar',
                    'informe.generar','informe.descargar','reporte.ver','usuario.ver');

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
 WHERE r.codigo = 'TECNICO_EVALUADOR'
   AND p.codigo IN ('catalogo.ver','empresa.ver','caso.ver','evaluacion.ejecutar',
                    'informe.generar','informe.descargar');

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
 WHERE r.codigo IN ('ADMIN_EMPRESA','USUARIO_DELEGADO')
   AND p.codigo IN ('solicitud.crear','solicitud.ver_propias','empresa.ver','informe.descargar');


-- ---------------------------------------------------------------------
-- Catálogos operativos
-- ---------------------------------------------------------------------
INSERT INTO tipo_contacto (codigo, nombre) VALUES
  ('LEGAL',        'Representante Legal'),
  ('CALIDAD',      'Representante de Calidad'),
  ('PRINCIPAL',    'Contacto Principal'),
  ('PROPIETARIO',  'Propietario'),
  ('REPRESENTANTE','Representante del Establecimiento');

INSERT INTO origen_caso (codigo, nombre, orden) VALUES
  ('SOLICITUD_EMPRESA',   'Solicitud de la empresa',    1),
  ('PROGRAMACION_INST',   'Programación institucional', 2),
  ('ALERTA_LAPCH',        'Alerta LAPCH',               3),
  ('DENUNCIA',            'Reporte o denuncia',         4);

INSERT INTO estado_evaluacion (codigo, nombre, es_final, bloquea_datos, orden) VALUES
  ('PENDIENTE_ASIGNACION', 'Pendiente de asignación',   FALSE, FALSE,  1),
  ('ASIGNADA',             'Asignada',                  FALSE, FALSE,  2),
  ('PROGRAMADA',           'Programada',                FALSE, FALSE,  3),
  ('EN_EJECUCION',         'En ejecución',              FALSE, FALSE,  4),
  ('FINALIZADA_CAMPO',     'Finalizada en campo',       FALSE, FALSE,  5),
  ('ENVIADA',              'Enviada a revisión',        FALSE, TRUE,   6),
  ('EN_REVISION',          'En revisión',               FALSE, TRUE,   7),
  ('DEVUELTA',             'Devuelta para corrección',  FALSE, FALSE,  8),
  ('APROBADA',             'Aprobada',                  FALSE, TRUE,   9),
  ('CERRADA',              'Cerrada',                   TRUE,  TRUE,  10),
  ('CANCELADA',            'Cancelada',                 TRUE,  TRUE,  11);


-- ---------------------------------------------------------------------
-- Versión de la matriz de riesgo
-- ---------------------------------------------------------------------
INSERT INTO version_matriz_riesgo (numero_version, nombre, fecha_vigencia_desde, estado)
VALUES ('2024.SBR', 'Categorización de Establecimiento y Frecuencia de Inspección (revisado SBR)',
        DATE '2024-01-01', 'PUBLICADA');


-- ---------------------------------------------------------------------
-- Los 6 factores de Riesgo del Establecimiento
-- Pesos verificados: 0.16 + 0.09 + 0.56 + 0.05 + 0.06 + 0.08 = 1.00
-- ---------------------------------------------------------------------
INSERT INTO factor_riesgo_establecimiento (version_matriz_id, numero, nombre, peso, es_automatico, fuente_automatica, orden)
SELECT v.id, x.numero, x.nombre, x.peso, x.auto, x.fuente, x.numero
  FROM version_matriz_riesgo v,
  (VALUES
    (1, 'Volumen de producción',                                          0.1600, FALSE, NULL),
    (2, 'Implementación sistema HACCP',                                   0.0900, FALSE, NULL),
    (3, 'Cumplimiento con las BPM',                                       0.5600, TRUE,  'porcentaje_cumplimiento'),
    (4, 'Proveedor INABIE',                                               0.0500, FALSE, NULL),
    (5, 'Rechazos Registros Sanitarios por incumplimiento microbiológico',0.0600, FALSE, NULL),
    (6, 'Planes de muestreo microbiológico / Análisis de laboratorio',    0.0800, FALSE, NULL)
  ) AS x(numero, nombre, peso, auto, fuente)
 WHERE v.numero_version = '2024.SBR';


-- ---------------------------------------------------------------------
-- Opciones de cada factor, con su puntaje (1 / 1.67 / 2.33 / 3)
-- ---------------------------------------------------------------------

-- Factor 1 — Volumen de producción
INSERT INTO opcion_factor (factor_id, descripcion, puntaje, orden)
SELECT f.id, x.d, x.p, x.o FROM factor_riesgo_establecimiento f,
  (VALUES ('Grande (>2.000.000 por mes)',              3.00, 1),
          ('Mediano (800.000 - 2.000.000 por mes)',    2.33, 2),
          ('Pequeño (200.000 - 800.000 por mes)',      1.67, 3),
          ('Micro (<200.000 por mes)',                 1.00, 4)) AS x(d,p,o)
 WHERE f.numero = 1;

-- Factor 2 — Implementación sistema HACCP
INSERT INTO opcion_factor (factor_id, descripcion, puntaje, orden)
SELECT f.id, x.d, x.p, x.o FROM factor_riesgo_establecimiento f,
  (VALUES ('No tiene implementado el sistema HACCP',                          3.00, 1),
          ('Tiene implementado el HACCP en el 25% de las líneas de producción',2.33, 2),
          ('Tiene implementado el HACCP en el 75% de las líneas de producción',1.67, 3),
          ('Tiene implementado el HACCP en todas las líneas de producción',    1.00, 4)) AS x(d,p,o)
 WHERE f.numero = 2;

-- Factor 3 — Cumplimiento con las BPM (automático: se deriva del % de la ficha)
INSERT INTO opcion_factor (factor_id, descripcion, puntaje, limite_inf, limite_sup, orden)
SELECT f.id, x.d, x.p, x.li, x.ls, x.o FROM factor_riesgo_establecimiento f,
  (VALUES ('≤ 60%',      3.00,   0.00,  60.00, 1),
          ('>60% - 70%', 2.33,  60.01,  70.00, 2),
          ('>70% - 80%', 1.67,  70.01,  80.00, 3),
          ('>80%',       1.00,  80.01, 100.00, 4)) AS x(d,p,li,ls,o)
 WHERE f.numero = 3;

-- Factor 4 — Proveedor INABIE
INSERT INTO opcion_factor (factor_id, descripcion, puntaje, orden)
SELECT f.id, x.d, x.p, x.o FROM factor_riesgo_establecimiento f,
  (VALUES ('Los productos que elaboran los sirven a nivel nacional', 3.00, 1),
          ('Los productos que elaboran los sirven a nivel regional', 2.33, 2),
          ('Los productos que elaboran los sirven a nivel local',    1.67, 3),
          ('No es suplidor del INABIE',                              1.00, 4)) AS x(d,p,o)
 WHERE f.numero = 4;

-- Factor 5 — Rechazos de Registro Sanitario
INSERT INTO opcion_factor (factor_id, descripcion, puntaje, orden)
SELECT f.id, x.d, x.p, x.o FROM factor_riesgo_establecimiento f,
  (VALUES ('Tiene más de 2 rechazos en los últimos 5 años',  3.00, 1),
          ('Tiene 2 rechazos en los últimos 5 años',         2.33, 2),
          ('Tiene 1 rechazo en los últimos 5 años',          1.67, 3),
          ('No tiene ningún rechazo en los últimos 5 años',  1.00, 4)) AS x(d,p,o)
 WHERE f.numero = 5;

-- Factor 6 — Planes de muestreo microbiológico
-- NOTA: en el Excel original este factor devuelve FALSE porque el valor de la celda
-- ("Plan de muestreo en materias primas") no coincide con ninguna cadena del IF.
-- Con opciones normalizadas y clave foránea, ese error es imposible (defecto D-01).
INSERT INTO opcion_factor (factor_id, descripcion, puntaje, orden)
SELECT f.id, x.d, x.p, x.o FROM factor_riesgo_establecimiento f,
  (VALUES ('No cuenta con plan de muestreo microbiológico',                                                              3.00, 1),
          ('Tiene plan de muestreo microbiológico solo para las materias primas',                                        2.33, 2),
          ('Tiene un plan de muestreo microbiológico solo para las áreas de proceso y productos terminados',              1.67, 3),
          ('Tiene un plan de muestreo microbiológico para las materias primas, las áreas de proceso y productos terminados', 1.00, 4)) AS x(d,p,o)
 WHERE f.numero = 6;


-- ---------------------------------------------------------------------
-- Matriz de Frecuencia de Inspección
-- RT = RP × RE  →  Fuente: Hoja Frecuencia Inspección, filas 38-41
-- ---------------------------------------------------------------------
INSERT INTO rango_frecuencia (version_matriz_id, limite_inferior, limite_superior,
                              incluye_inferior, incluye_superior, nivel_riesgo_id,
                              frecuencia, meses_hasta_proxima, orden)
SELECT v.id, x.li, x.ls, x.ii, x.isup, n.id, x.frec, x.meses, x.orden
  FROM version_matriz_riesgo v,
  (VALUES (1.00, 3.60, TRUE,  TRUE,  'BAJO',  'Anual',       12, 1),
          (3.60, 6.30, FALSE, TRUE,  'MEDIO', 'Semestral',    6, 2),
          (6.30, 9.00, FALSE, TRUE,  'ALTO',  'Trimestral',   3, 3))
   AS x(li, ls, ii, isup, nivel, frec, meses, orden)
  JOIN nivel_riesgo n ON n.codigo = x.nivel
 WHERE v.numero_version = '2024.SBR';


-- ---------------------------------------------------------------------
-- AMBIGÜEDAD A-01 — pendiente de confirmación por la DIGEMAPS
--
-- La matriz de alimentos produce un riesgo total numérico en escala 2-8
-- (promedio de los puntajes microbiológico y químico), pero la hoja de
-- frecuencia consume niveles Bajo=1 / Medio=2 / Alto=3. La regla de
-- conversión NO aparece en ningún archivo fuente.
--
-- Se carga un supuesto marcado con es_supuesto = TRUE. Cuando llegue la
-- respuesta oficial, corregirlo es un UPDATE de tres filas, no un cambio
-- de código.
-- ---------------------------------------------------------------------
INSERT INTO rango_nivel_riesgo (version_matriz_id, limite_inferior, limite_superior,
                                nivel_riesgo_id, es_supuesto, nota, orden)
SELECT v.id, x.li, x.ls, n.id, TRUE,
       'SUPUESTO del equipo de desarrollo. Pendiente de confirmación por la DIGEMAPS (ambigüedad A-01)',
       x.orden
  FROM version_matriz_riesgo v,
  (VALUES (2.00, 2.99, 'BAJO',  1),
          (3.00, 5.99, 'MEDIO', 2),
          (6.00, 8.00, 'ALTO',  3)) AS x(li, ls, nivel, orden)
  JOIN nivel_riesgo n ON n.codigo = x.nivel
 WHERE v.numero_version = '2024.SBR';


-- ---------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------
DO $$
DECLARE v_pesos NUMERIC(8,4); v_opc INT;
BEGIN
    SELECT SUM(peso) INTO v_pesos FROM factor_riesgo_establecimiento;
    SELECT COUNT(*)  INTO v_opc   FROM opcion_factor;

    RAISE NOTICE 'Suma de pesos de los factores: % (debe ser 1.0000)', v_pesos;
    RAISE NOTICE 'Opciones de factor cargadas: % (esperadas 24)', v_opc;

    IF v_pesos <> 1.0000 THEN
        RAISE EXCEPTION 'La suma de pesos es % y debe ser exactamente 1.0000', v_pesos;
    END IF;
    IF v_opc <> 24 THEN
        RAISE EXCEPTION 'Se esperaban 24 opciones de factor, hay %', v_opc;
    END IF;
    RAISE NOTICE 'Seed de catálogos verificado correctamente';
END $$;
