-- =====================================================================
-- Archivo 07 — Ajustes al modelo del equipo (reto agosto 2026)
--
-- Se aplica SOBRE el modelo de 25 tablas ya diagramado.
-- No lo reemplaza: lo completa.
--
-- Prioridades:
--   P0  El motor de riesgo no funciona sin esto
--   P1  Hay requisitos del SRS sin tabla donde vivir
--   P2  Calidad del modelo y normalización
--
-- Si el tiempo alcanza solo para una parte, aplicar P0 completo.
-- =====================================================================


-- #####################################################################
-- P0 — CORRECCIONES QUE HABILITAN EL MOTOR
-- #####################################################################

-- ---------------------------------------------------------------------
-- P0.1 — Falta nivel_riesgo: sin esta tabla el RP no se puede calcular
-- ---------------------------------------------------------------------
CREATE TABLE nivel_riesgo (
    id              smallserial PRIMARY KEY,
    codigo          varchar(10)  NOT NULL UNIQUE,   -- BAJO | MEDIO | ALTO
    nombre          varchar(50)  NOT NULL,
    puntaje_matriz  numeric(4,2) NOT NULL,          -- 2 | 4 | 8   (matriz de alimentos)
    puntaje_rp      numeric(4,2) NOT NULL,          -- 1 | 2 | 3   (riesgo del producto)
    color_hex       char(7),
    orden           smallint     NOT NULL
);
COMMENT ON TABLE nivel_riesgo IS
  'Reconcilia las dos escalas del dominio en un solo registro por nivel';

INSERT INTO nivel_riesgo (codigo, nombre, puntaje_matriz, puntaje_rp, color_hex, orden) VALUES
  ('BAJO',  'Riesgo bajo',  2.00, 1.00, '#2E7D32', 1),
  ('MEDIO', 'Riesgo medio', 4.00, 2.00, '#F9A825', 2),
  ('ALTO',  'Riesgo alto',  8.00, 3.00, '#C62828', 3);

ALTER TABLE subcategoria_alimento
    ADD COLUMN id_nivel_riesgo_microbiologico smallint REFERENCES nivel_riesgo(id),
    ADD COLUMN id_nivel_riesgo_quimico        smallint REFERENCES nivel_riesgo(id),
    ADD COLUMN riesgo_total_calculado         numeric(5,2),
    ADD COLUMN id_nivel_riesgo_resultante     smallint REFERENCES nivel_riesgo(id),
    ADD COLUMN requiere_revision              boolean NOT NULL DEFAULT false,
    ADD COLUMN nota_revision                  varchar(300);

-- rango_nivel_riesgo apuntaba a un nivel que no existía en ninguna tabla
ALTER TABLE rango_nivel_riesgo
    ADD COLUMN id_nivel_riesgo smallint REFERENCES nivel_riesgo(id);

ALTER TABLE rango_frecuencia
    ADD COLUMN id_nivel_riesgo  smallint REFERENCES nivel_riesgo(id),
    ADD COLUMN incluye_inferior boolean NOT NULL DEFAULT true,
    ADD COLUMN incluye_superior boolean NOT NULL DEFAULT true,
    ADD COLUMN orden            smallint;
COMMENT ON COLUMN rango_frecuencia.incluye_superior IS
  'Los bordes importan: 1.0-3.6 INCLUYE 3.6 y >3.6-6.3 INCLUYE 6.3';


-- ---------------------------------------------------------------------
-- P0.2 — Falta nivel_criticidad: la regla de aprobación no puede correr
-- ---------------------------------------------------------------------
CREATE TABLE nivel_criticidad (
    id      smallserial PRIMARY KEY,
    codigo  varchar(3)  NOT NULL UNIQUE,   -- C | M | Me
    nombre  varchar(40) NOT NULL,
    orden   smallint    NOT NULL
);

INSERT INTO nivel_criticidad (codigo, nombre, orden) VALUES
  ('C',  'No Conformidad Crítica', 1),
  ('M',  'No Conformidad Mayor',   2),
  ('Me', 'No Conformidad Menor',   3);

ALTER TABLE item_ficha
    ADD COLUMN id_criticidad smallint REFERENCES nivel_criticidad(id);

ALTER TABLE respuesta_item
    ADD COLUMN id_criticidad smallint REFERENCES nivel_criticidad(id);

ALTER TABLE calculo_riesgo
    ADD COLUMN nc_criticas smallint NOT NULL DEFAULT 0,
    ADD COLUMN nc_mayores  smallint NOT NULL DEFAULT 0,
    ADD COLUMN nc_menores  smallint NOT NULL DEFAULT 0;


-- ---------------------------------------------------------------------
-- P0.3 — PRECISIÓN NUMÉRICA
--
-- numeric(6,2) en 'aporte' clasifica MAL el establecimiento.
-- Verificado sobre las 12.288 combinaciones posibles de los 6 factores
-- x 3 valores de RP: en 31 casos la frecuencia resultante es incorrecta.
--
--   Ejemplo: factores [1.00, 1.00, 1.00, 1.00, 1.67, 3.00], RP = 3
--     RT exacto      = 3.6006  -> Semestral
--     RT redondeado  = 3.6000  -> Anual        (INCORRECTO)
--
-- El sesgo va siempre hacia inspeccionar MENOS de lo que corresponde.
-- Causa: 2.33 x 0.08 = 0.1864, que a dos decimales es 0.19. Seis
-- redondeos acumulados desplazan el RE lo suficiente para cruzar 3.6.
-- ---------------------------------------------------------------------
ALTER TABLE factor_riesgo_establecimiento
    ALTER COLUMN peso TYPE numeric(6,4);

ALTER TABLE evaluacion_factor_riesgo
    ALTER COLUMN peso_aplicado TYPE numeric(6,4),
    ALTER COLUMN aporte        TYPE numeric(8,4);

ALTER TABLE calculo_riesgo
    ALTER COLUMN re_valor TYPE numeric(8,4),
    ALTER COLUMN rt_valor TYPE numeric(8,4);

-- Los 6 pesos deben sumar exactamente 1.00
CREATE OR REPLACE FUNCTION fn_validar_suma_pesos() RETURNS trigger AS $$
DECLARE v_version bigint; v_total numeric(8,4);
BEGIN
    v_version := COALESCE(NEW.id_version_matriz, OLD.id_version_matriz);
    SELECT COALESCE(SUM(peso),0) INTO v_total
      FROM factor_riesgo_establecimiento WHERE id_version_matriz = v_version;
    IF v_total > 1.0001 THEN
        RAISE EXCEPTION 'La suma de pesos de la version % es % y no puede exceder 1.00', v_version, v_total;
    END IF;
    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_pesos
AFTER INSERT OR UPDATE OR DELETE ON factor_riesgo_establecimiento
FOR EACH ROW EXECUTE FUNCTION fn_validar_suma_pesos();


-- ---------------------------------------------------------------------
-- P0.4 — item_ficha sin 'orden': la ficha se renderiza desordenada
-- Ordenar por numeracion como texto pone "1.10" antes que "1.2"
-- ---------------------------------------------------------------------
ALTER TABLE item_ficha
    ADD COLUMN orden  smallint NOT NULL DEFAULT 0,
    ADD COLUMN nivel  smallint,
    ADD COLUMN activo boolean NOT NULL DEFAULT true,
    ADD CONSTRAINT ck_item_no_autopadre CHECK (id_padre IS NULL OR id_padre <> id),
    ADD CONSTRAINT uq_item_numeracion   UNIQUE (id_version_ficha, numeracion);

CREATE INDEX ix_item_padre ON item_ficha(id_padre);
CREATE INDEX ix_item_eval  ON item_ficha(id_version_ficha) WHERE es_evaluable;


-- ---------------------------------------------------------------------
-- P0.5 — El factor 3 automático no puede mapear el porcentaje
-- ---------------------------------------------------------------------
ALTER TABLE opcion_factor
    ADD COLUMN limite_inf numeric(6,2),
    ADD COLUMN limite_sup numeric(6,2),
    ADD COLUMN orden      smallint;

COMMENT ON COLUMN opcion_factor.limite_inf IS
  'Solo en factores automaticos: rango de porcentaje que mapea a esta opcion (<=60, >60-70, >70-80, >80)';


-- ---------------------------------------------------------------------
-- P0.6 — calculo_riesgo perdió el rastro de auditoría.
-- Sin el denominador, la exclusión de N/A es INVISIBLE y no se puede
-- demostrar que se aplicó bien, que es justo lo que hay que demostrar.
-- ---------------------------------------------------------------------
ALTER TABLE calculo_riesgo
    ADD COLUMN puntos_obtenidos         numeric(8,2),
    ADD COLUMN puntos_excluidos_na      numeric(8,2),
    ADD COLUMN puntaje_total_posible    numeric(8,2),
    ADD COLUMN denominador_efectivo     numeric(8,2),
    ADD COLUMN items_respondidos        smallint,
    ADD COLUMN items_na                 smallint,
    ADD COLUMN calificacion_texto       varchar(200),
    ADD COLUMN aprueba                  boolean,
    ADD COLUMN otorga_permiso_sanitario boolean NOT NULL DEFAULT false,
    ADD COLUMN id_nivel_riesgo          smallint REFERENCES nivel_riesgo(id),
    ADD COLUMN id_subcategoria_rp       bigint   REFERENCES subcategoria_alimento(id),
    ADD COLUMN fecha_calculo            timestamp NOT NULL DEFAULT now(),
    ADD CONSTRAINT ck_denominador CHECK (denominador_efectivo IS NULL OR denominador_efectivo > 0);


-- ---------------------------------------------------------------------
-- P0.7 — Persistencia histórica a medias: se congeló el valor pero no el peso
-- ---------------------------------------------------------------------
ALTER TABLE respuesta_item
    ADD COLUMN peso_aplicado numeric(6,2) NOT NULL DEFAULT 1.00,
    ADD COLUMN observacion   text,
    ADD COLUMN uuid_local    uuid NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN sincronizado  boolean NOT NULL DEFAULT false,
    ADD CONSTRAINT uq_respuesta_item UNIQUE (id_evaluacion, id_item_ficha),
    ADD CONSTRAINT uq_respuesta_uuid UNIQUE (uuid_local);

COMMENT ON COLUMN respuesta_item.peso_aplicado IS
  'item_ficha.peso existe para poder cambiar el valor de una pregunta. Si no se congela aqui, el historico se altera igual';


-- ---------------------------------------------------------------------
-- P0.8 — Umbral de permiso sanitario (>81%) que faltaba en version_ficha
-- ---------------------------------------------------------------------
ALTER TABLE version_ficha
    ADD COLUMN nombre                       varchar(250),
    ADD COLUMN fecha_vigencia_desde         date,
    ADD COLUMN fecha_vigencia_hasta         date,
    ADD COLUMN total_items_evaluables       smallint NOT NULL DEFAULT 0,
    ADD COLUMN puntaje_total_posible        numeric(8,2) NOT NULL DEFAULT 0,
    ADD COLUMN porcentaje_permiso_sanitario numeric(5,2) NOT NULL DEFAULT 81;

-- Los 4 rangos de calificación (<=60, >60-70, >70-80, >80) tampoco tenían tabla
CREATE TABLE rango_calificacion (
    id                bigserial PRIMARY KEY,
    id_version_ficha  bigint NOT NULL REFERENCES version_ficha(id) ON DELETE CASCADE,
    limite_inferior   numeric(5,2) NOT NULL,
    limite_superior   numeric(5,2) NOT NULL,
    incluye_inferior  boolean NOT NULL DEFAULT false,
    incluye_superior  boolean NOT NULL DEFAULT true,
    descripcion       varchar(120) NOT NULL,
    accion            varchar(150) NOT NULL,
    orden             smallint NOT NULL
);

ALTER TABLE calculo_riesgo
    ADD COLUMN id_rango_calificacion bigint REFERENCES rango_calificacion(id);


-- #####################################################################
-- P1 — REQUISITOS DEL SRS SIN TABLA DONDE VIVIR
-- #####################################################################

-- ---------------------------------------------------------------------
-- P1.1 — RF-15 Captura de evidencias: no existía ninguna tabla
-- ---------------------------------------------------------------------
CREATE TABLE evidencia (
    id                  bigserial PRIMARY KEY,
    uuid_local          uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    id_evaluacion       bigint NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
    id_respuesta_item   bigint REFERENCES respuesta_item(id) ON DELETE CASCADE,
    tipo                varchar(15) NOT NULL CHECK (tipo IN ('FOTO','DOCUMENTO','VIDEO')),
    nombre_archivo      varchar(250) NOT NULL,
    ruta_almacenamiento varchar(500),
    tipo_mime           varchar(100),
    tamano_bytes        bigint,
    hash_sha256         char(64),
    latitud             numeric(10,7),
    longitud            numeric(10,7),
    comentario          text,
    fecha_captura       timestamp NOT NULL DEFAULT now(),
    sincronizado        boolean NOT NULL DEFAULT false
);
CREATE INDEX ix_evidencia_eval ON evidencia(id_evaluacion);
CREATE INDEX ix_evidencia_pend ON evidencia(id_evaluacion) WHERE NOT sincronizado;


-- ---------------------------------------------------------------------
-- P1.2 — El ciclo NO CIERRA: falta el escenario 2 (programación institucional)
-- caso tiene FK a solicitud, alerta y denuncia, pero no a programación.
-- La frecuencia calculada no tiene a dónde ir.
-- ---------------------------------------------------------------------
CREATE TABLE programacion_institucional (
    id                    bigserial PRIMARY KEY,
    id_establecimiento    bigint NOT NULL REFERENCES establecimiento(id),
    id_evaluacion_origen  bigint REFERENCES evaluacion(id),
    fecha_programada      date NOT NULL,
    frecuencia_aplicada   varchar(20) NOT NULL,
    generada_automatica   boolean NOT NULL DEFAULT true,
    prioridad             varchar(20) NOT NULL DEFAULT 'NORMAL',
    observaciones         text,
    fecha_creacion        timestamp NOT NULL DEFAULT now()
);
COMMENT ON TABLE programacion_institucional IS
  'Cierra el ciclo: la frecuencia calculada en una evaluacion genera la programacion de la siguiente';

ALTER TABLE caso
    ADD COLUMN id_programacion bigint REFERENCES programacion_institucional(id);

-- Exactamente uno de los cuatro orígenes debe estar presente.
-- Hoy nada lo impide: se puede crear un caso con los cuatro nulos o con dos.
ALTER TABLE caso
    ADD CONSTRAINT ck_caso_origen_unico CHECK (
        (CASE WHEN id_solicitud    IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN id_alerta       IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN id_denuncia     IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN id_programacion IS NOT NULL THEN 1 ELSE 0 END) = 1
    );


-- ---------------------------------------------------------------------
-- P1.3 — evaluacion solo tiene 'bloqueada boolean'.
-- No hay forma de saber si está asignada, en ejecución, enviada,
-- en revisión o devuelta. RF-17 y RF-18 dependen de esto.
-- ---------------------------------------------------------------------
CREATE TABLE estado_evaluacion (
    id            smallserial PRIMARY KEY,
    codigo        varchar(30) NOT NULL UNIQUE,
    nombre        varchar(80) NOT NULL,
    es_final      boolean NOT NULL DEFAULT false,
    bloquea_datos boolean NOT NULL DEFAULT false,
    orden         smallint NOT NULL
);

INSERT INTO estado_evaluacion (codigo, nombre, es_final, bloquea_datos, orden) VALUES
  ('PENDIENTE_ASIGNACION','Pendiente de asignacion',  false, false,  1),
  ('ASIGNADA',            'Asignada',                 false, false,  2),
  ('PROGRAMADA',          'Programada',               false, false,  3),
  ('EN_EJECUCION',        'En ejecucion',             false, false,  4),
  ('FINALIZADA_CAMPO',    'Finalizada en campo',      false, false,  5),
  ('ENVIADA',             'Enviada a revision',       false, true,   6),
  ('EN_REVISION',         'En revision',              false, true,   7),
  ('DEVUELTA',            'Devuelta para correccion', false, false,  8),
  ('APROBADA',            'Aprobada',                 false, true,   9),
  ('CERRADA',             'Cerrada',                  true,  true,  10),
  ('CANCELADA',           'Cancelada',                true,  true,  11);

ALTER TABLE evaluacion
    ADD COLUMN id_estado        smallint REFERENCES estado_evaluacion(id),
    ADD COLUMN id_coordinador   bigint REFERENCES usuario(id),
    ADD COLUMN fecha_programada date,
    ADD COLUMN fecha_envio      timestamp,
    ADD COLUMN fecha_revision   timestamp,
    ADD COLUMN version_registro int NOT NULL DEFAULT 1,
    ADD COLUMN latitud          numeric(10,7),
    ADD COLUMN longitud         numeric(10,7);

COMMENT ON COLUMN evaluacion.version_registro IS
  'Control optimista de concurrencia para la sincronizacion offline';

CREATE TABLE historial_estado (
    id                 bigserial PRIMARY KEY,
    id_evaluacion      bigint NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
    id_estado_origen   smallint REFERENCES estado_evaluacion(id),
    id_estado_destino  smallint NOT NULL REFERENCES estado_evaluacion(id),
    id_usuario         bigint NOT NULL REFERENCES usuario(id),
    comentario         text,
    fecha_hora         timestamp NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------
-- P1.4 — Las 10 medidas correctivas de la ficha (grupo repetitivo)
-- ---------------------------------------------------------------------
CREATE TABLE medida_correctiva (
    id            bigserial PRIMARY KEY,
    id_evaluacion bigint NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
    numero        smallint NOT NULL,
    detalle       text NOT NULL,
    plazo_dias    smallint,
    fecha_limite  date,
    cumplida      boolean NOT NULL DEFAULT false,
    CONSTRAINT uq_medida UNIQUE (id_evaluacion, numero)
);


-- ---------------------------------------------------------------------
-- P1.5 — RF-04 notificaciones y RNF-02 trazabilidad
-- ---------------------------------------------------------------------
CREATE TABLE notificacion (
    id             bigserial PRIMARY KEY,
    id_usuario     bigint NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    tipo           varchar(50) NOT NULL,
    titulo         varchar(200) NOT NULL,
    mensaje        text NOT NULL,
    entidad        varchar(50),
    id_entidad     bigint,
    leida          boolean NOT NULL DEFAULT false,
    enviada_correo boolean NOT NULL DEFAULT false,
    fecha_creacion timestamp NOT NULL DEFAULT now()
);
CREATE INDEX ix_notif_usuario ON notificacion(id_usuario) WHERE NOT leida;

CREATE TABLE auditoria (
    id                 bigserial PRIMARY KEY,
    entidad            varchar(60) NOT NULL,
    id_entidad         varchar(40),
    accion             varchar(20) NOT NULL,
    id_usuario         bigint REFERENCES usuario(id),
    ip                 inet,
    valores_anteriores jsonb,
    valores_nuevos     jsonb,
    fecha_hora         timestamp NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_entidad ON auditoria(entidad, id_entidad);


-- #####################################################################
-- P2 — NORMALIZACIÓN Y CALIDAD
-- #####################################################################

-- ---------------------------------------------------------------------
-- P2.1 — usuario.rol varchar(30): sin RBAC real (RNF-02).
-- Un usuario solo puede tener un rol y los permisos quedan como
-- comparaciones de cadenas repartidas por el codigo.
-- ---------------------------------------------------------------------
CREATE TABLE rol (
    id          smallserial PRIMARY KEY,
    codigo      varchar(30) NOT NULL UNIQUE,
    nombre      varchar(80) NOT NULL,
    es_interno  boolean NOT NULL DEFAULT true
);

INSERT INTO rol (codigo, nombre, es_interno) VALUES
  ('ADMINISTRADOR',     'Administrador',         true),
  ('ADMIN_EMPRESA',     'Administrador Empresa', false),
  ('USUARIO_DELEGADO',  'Usuario Delegado',      false),
  ('COORDINADOR',       'Coordinador',           true),
  ('TECNICO_EVALUADOR', 'Tecnico Evaluador',     true);

CREATE TABLE permiso (
    id     bigserial PRIMARY KEY,
    codigo varchar(80) NOT NULL UNIQUE,
    modulo varchar(40) NOT NULL,
    nombre varchar(150) NOT NULL
);

CREATE TABLE rol_permiso (
    id_rol     smallint NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
    id_permiso bigint   NOT NULL REFERENCES permiso(id) ON DELETE CASCADE,
    PRIMARY KEY (id_rol, id_permiso)
);

CREATE TABLE usuario_rol (
    id_usuario bigint   NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    id_rol     smallint NOT NULL REFERENCES rol(id),
    PRIMARY KEY (id_usuario, id_rol)
);

-- Migrar el varchar existente y luego eliminarlo
INSERT INTO usuario_rol (id_usuario, id_rol)
SELECT u.id, r.id FROM usuario u JOIN rol r ON r.codigo = u.rol
ON CONFLICT DO NOTHING;
-- ALTER TABLE usuario DROP COLUMN rol;   -- descomentar tras verificar la migracion

ALTER TABLE usuario
    ADD COLUMN id_empresa        bigint REFERENCES empresa(id),
    ADD COLUMN estado            varchar(25) NOT NULL DEFAULT 'PENDIENTE_VALIDACION'
               CHECK (estado IN ('PENDIENTE_VALIDACION','APROBADO','RECHAZADO','INACTIVO')),
    ADD COLUMN motivo_rechazo    varchar(400),
    ADD COLUMN intentos_fallidos smallint NOT NULL DEFAULT 0,
    ADD COLUMN bloqueado_hasta   timestamp;
-- RF-02 exige los estados Pendiente Validacion / Aprobado / Rechazado


-- ---------------------------------------------------------------------
-- P2.2 — empresa.municipio y provincia como varchar: dependencia
-- transitiva (municipio -> provincia). Anomalia predecible:
-- "Santo Domingo Este" tecleado de cinco formas y ningun reporte que cuadre.
-- ---------------------------------------------------------------------
CREATE TABLE provincia (
    id     smallserial PRIMARY KEY,
    codigo varchar(10) NOT NULL UNIQUE,
    nombre varchar(100) NOT NULL
);

CREATE TABLE municipio (
    id           bigserial PRIMARY KEY,
    id_provincia smallint NOT NULL REFERENCES provincia(id),
    codigo       varchar(10) NOT NULL UNIQUE,
    nombre       varchar(120) NOT NULL
);

CREATE TABLE dps_das (
    id           smallserial PRIMARY KEY,
    codigo       varchar(15) NOT NULL UNIQUE,
    nombre       varchar(150) NOT NULL,
    tipo         varchar(5) NOT NULL CHECK (tipo IN ('DPS','DAS')),
    id_provincia smallint REFERENCES provincia(id)
);

ALTER TABLE empresa
    ADD COLUMN id_municipio bigint REFERENCES municipio(id);
-- Tras migrar los textos: ALTER TABLE empresa DROP COLUMN municipio, DROP COLUMN provincia;

-- establecimiento estaba casi vacío: le faltan todos los datos de
-- cabecera de la ficha de inspección
ALTER TABLE establecimiento
    ADD COLUMN id_municipio              bigint REFERENCES municipio(id),
    ADD COLUMN id_dps_das                smallint REFERENCES dps_das(id),
    ADD COLUMN calle                     varchar(300),
    ADD COLUMN telefono                  varchar(20),
    ADD COLUMN correo                    varchar(150),
    ADD COLUMN fecha_inicio_operaciones  date,
    ADD COLUMN numero_permiso_sanitario  varchar(50),
    ADD COLUMN fecha_vencimiento_permiso date,
    ADD COLUMN produccion_anual          numeric(14,2),
    ADD COLUMN empleados_masculino       smallint NOT NULL DEFAULT 0,
    ADD COLUMN empleados_femenino        smallint NOT NULL DEFAULT 0,
    ADD COLUMN mercado_objetivo          varchar(150),
    ADD COLUMN latitud                   numeric(10,7),
    ADD COLUMN longitud                  numeric(10,7),
    ADD COLUMN activo                    boolean NOT NULL DEFAULT true;


-- ---------------------------------------------------------------------
-- P2.3 — caso.origen como cadena magica sin catalogo.
-- Es el MISMO defecto D-01 del Excel (comparar contra texto libre en
-- vez de contra una clave foranea) reproducido en el modelo que se
-- supone lo corrige.
-- ---------------------------------------------------------------------
CREATE TABLE origen_caso (
    id     smallserial PRIMARY KEY,
    codigo varchar(30) NOT NULL UNIQUE,
    nombre varchar(120) NOT NULL,
    orden  smallint NOT NULL
);

INSERT INTO origen_caso (codigo, nombre, orden) VALUES
  ('SOLICITUD_EMPRESA', 'Solicitud de la empresa',    1),
  ('PROGRAMACION_INST', 'Programacion institucional', 2),
  ('ALERTA_LAPCH',      'Alerta LAPCH',               3),
  ('DENUNCIA',          'Reporte o denuncia',         4);

ALTER TABLE caso
    ADD COLUMN id_origen smallint REFERENCES origen_caso(id);
-- Tras migrar: ALTER TABLE caso DROP COLUMN origen;


-- ---------------------------------------------------------------------
-- P2.4 — Representantes de empresa (RF-03: legal, calidad, principal)
-- ---------------------------------------------------------------------
CREATE TABLE tipo_contacto (
    id     smallserial PRIMARY KEY,
    codigo varchar(25) NOT NULL UNIQUE,
    nombre varchar(60) NOT NULL
);

INSERT INTO tipo_contacto (codigo, nombre) VALUES
  ('LEGAL',        'Representante Legal'),
  ('CALIDAD',      'Representante de Calidad'),
  ('PRINCIPAL',    'Contacto Principal'),
  ('PROPIETARIO',  'Propietario'),
  ('REPRESENTANTE','Representante del Establecimiento');

CREATE TABLE contacto (
    id                  bigserial PRIMARY KEY,
    id_tipo_contacto    smallint NOT NULL REFERENCES tipo_contacto(id),
    id_empresa          bigint REFERENCES empresa(id) ON DELETE CASCADE,
    id_establecimiento  bigint REFERENCES establecimiento(id) ON DELETE CASCADE,
    nombre_completo     varchar(150) NOT NULL,
    documento_identidad varchar(20),
    telefono            varchar(20),
    celular             varchar(20),
    correo              varchar(150),
    CONSTRAINT ck_contacto_duenio CHECK (
        (id_empresa IS NOT NULL AND id_establecimiento IS NULL) OR
        (id_empresa IS NULL AND id_establecimiento IS NOT NULL)
    )
);


-- ---------------------------------------------------------------------
-- P2.5 — Alertas y denuncias apuntan a empresa, pero la evaluacion
-- ocurre a nivel de ESTABLECIMIENTO. Si una empresa tiene tres plantas,
-- el modelo no dice cual se inspecciona.
-- ---------------------------------------------------------------------
ALTER TABLE alerta_lapch
    ADD COLUMN id_establecimiento bigint REFERENCES establecimiento(id);

ALTER TABLE denuncia
    ADD COLUMN id_establecimiento bigint REFERENCES establecimiento(id);


-- ---------------------------------------------------------------------
-- P2.6 — Una evaluacion bloqueada no debe admitir cambios (RF-17)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_evaluacion_bloqueada() RETURNS trigger AS $$
DECLARE v_bloqueada boolean;
BEGIN
    SELECT bloqueada INTO v_bloqueada
      FROM evaluacion WHERE id = COALESCE(NEW.id_evaluacion, OLD.id_evaluacion);
    IF v_bloqueada THEN
        RAISE EXCEPTION 'La evaluacion esta bloqueada tras su envio y no admite modificaciones';
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_eval_bloqueada
BEFORE INSERT OR UPDATE OR DELETE ON respuesta_item
FOR EACH ROW EXECUTE FUNCTION fn_validar_evaluacion_bloqueada();

-- Solo una version publicada a la vez por catalogo
CREATE UNIQUE INDEX ux_version_ficha_publicada
    ON version_ficha (estado) WHERE estado = 'PUBLICADA';
CREATE UNIQUE INDEX ux_version_matriz_publicada
    ON version_matriz_riesgo (estado) WHERE estado = 'PUBLICADA';


-- ---------------------------------------------------------------------
-- P2.7 — Cola de sincronizacion offline (RNF-01)
-- ---------------------------------------------------------------------
CREATE TABLE operacion_pendiente (
    id                     bigserial PRIMARY KEY,
    uuid_local             uuid NOT NULL UNIQUE,
    id_usuario             bigint NOT NULL REFERENCES usuario(id),
    tipo_operacion         varchar(20) NOT NULL,
    entidad                varchar(60) NOT NULL,
    payload                jsonb NOT NULL,
    estado                 varchar(20) NOT NULL DEFAULT 'PENDIENTE',
    intentos               smallint NOT NULL DEFAULT 0,
    error_mensaje          text,
    fecha_creacion_cliente timestamp NOT NULL,
    fecha_recepcion        timestamp NOT NULL DEFAULT now()
);
COMMENT ON TABLE operacion_pendiente IS
  'uuid_local garantiza idempotencia: reenviar un lote no duplica respuestas';


-- =====================================================================
-- RESUMEN
--
-- P0  8 correcciones — sin ellas el motor de riesgo no calcula
-- P1  5 tablas nuevas — requisitos del SRS sin donde vivir
-- P2  7 mejoras de normalizacion
--
-- Modelo original:   25 tablas
-- Con P0 aplicado:   28 tablas  (motor funcional)
-- Con P0+P1:         35 tablas  (SRS cubierto)
-- Con P0+P1+P2:      46 tablas  (normalizado)
--
-- Recomendacion: aplicar P0 completo antes de escribir codigo.
-- P1 durante el sprint 1. P2 se puede negociar segun el tiempo.
-- =====================================================================
