-- =====================================================================
-- Sistema PWA de Evaluación Basada en Riesgo (EBR/BPM)
-- Ministerio de Salud Pública — DIGEMAPS
-- Motor de base de datos: PostgreSQL 16+
--
-- Archivo 01 de 05 — Esquema (DDL)
-- Orden de ejecución: 01_schema → 02_seed_catalogos → 03_seed_ficha_bpm
--                     → 04_seed_matriz_alimentos → 05_funciones
-- =====================================================================

DROP SCHEMA IF EXISTS ebr CASCADE;
CREATE SCHEMA ebr;
SET search_path TO ebr, public;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- =====================================================================
-- MÓDULO 1 — SEGURIDAD
-- =====================================================================

CREATE TABLE rol (
    id           SMALLSERIAL PRIMARY KEY,
    codigo       VARCHAR(30)  NOT NULL UNIQUE,
    nombre       VARCHAR(80)  NOT NULL,
    descripcion  VARCHAR(300),
    es_interno   BOOLEAN      NOT NULL DEFAULT TRUE,
    activo       BOOLEAN      NOT NULL DEFAULT TRUE
);
COMMENT ON COLUMN rol.es_interno IS 'FALSE en roles de empresa (Administrador Empresa, Usuario Delegado)';

CREATE TABLE permiso (
    id      SERIAL PRIMARY KEY,
    codigo  VARCHAR(80)  NOT NULL UNIQUE,   -- evaluacion.ejecutar, catalogo.editar, ...
    modulo  VARCHAR(40)  NOT NULL,
    nombre  VARCHAR(150) NOT NULL
);

CREATE TABLE rol_permiso (
    rol_id      SMALLINT NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
    permiso_id  INT      NOT NULL REFERENCES permiso(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE usuario (
    id                     SERIAL PRIMARY KEY,
    uuid_local             UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    nombre_completo        VARCHAR(150) NOT NULL,
    documento_identidad    VARCHAR(20)  NOT NULL,
    tipo_documento         VARCHAR(15)  NOT NULL DEFAULT 'CEDULA'
                           CHECK (tipo_documento IN ('CEDULA','PASAPORTE')),
    correo                 VARCHAR(150) NOT NULL UNIQUE,
    telefono               VARCHAR(25),
    hash_password          VARCHAR(255) NOT NULL,
    empresa_id             INT,                        -- FK diferida (módulo 3)
    estado                 VARCHAR(25)  NOT NULL DEFAULT 'PENDIENTE_VALIDACION'
                           CHECK (estado IN ('PENDIENTE_VALIDACION','APROBADO','RECHAZADO','INACTIVO')),
    motivo_rechazo         VARCHAR(400),
    carta_autorizacion_id  INT,                        -- FK diferida (módulo 8)
    doble_factor_activo    BOOLEAN NOT NULL DEFAULT FALSE,
    secreto_2fa            VARCHAR(120),
    intentos_fallidos      SMALLINT NOT NULL DEFAULT 0,
    bloqueado_hasta        TIMESTAMPTZ,
    ultimo_acceso          TIMESTAMPTZ,
    fecha_creacion         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuario_doc UNIQUE (tipo_documento, documento_identidad)
);

CREATE TABLE usuario_rol (
    usuario_id  INT      NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    rol_id      SMALLINT NOT NULL REFERENCES rol(id),
    PRIMARY KEY (usuario_id, rol_id)
);

CREATE TABLE refresh_token (
    id           BIGSERIAL PRIMARY KEY,
    usuario_id   INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    token_hash   VARCHAR(255) NOT NULL,
    expira_en    TIMESTAMPTZ  NOT NULL,
    revocado     BOOLEAN      NOT NULL DEFAULT FALSE,
    dispositivo  VARCHAR(200),
    creado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_refresh_usuario ON refresh_token(usuario_id) WHERE NOT revocado;


-- =====================================================================
-- MÓDULO 2 — GEOGRAFÍA
-- =====================================================================

CREATE TABLE provincia (
    id      SMALLSERIAL PRIMARY KEY,
    codigo  VARCHAR(10) NOT NULL UNIQUE,
    nombre  VARCHAR(100) NOT NULL
);

CREATE TABLE municipio (
    id            SERIAL PRIMARY KEY,
    provincia_id  SMALLINT NOT NULL REFERENCES provincia(id),
    codigo        VARCHAR(10) NOT NULL UNIQUE,
    nombre        VARCHAR(120) NOT NULL
);
CREATE INDEX ix_municipio_prov ON municipio(provincia_id);

CREATE TABLE dps_das (
    id            SMALLSERIAL PRIMARY KEY,
    codigo        VARCHAR(15) NOT NULL UNIQUE,
    nombre        VARCHAR(150) NOT NULL,
    tipo          VARCHAR(5) NOT NULL CHECK (tipo IN ('DPS','DAS')),
    provincia_id  SMALLINT REFERENCES provincia(id),
    activo        BOOLEAN NOT NULL DEFAULT TRUE
);


-- =====================================================================
-- MÓDULO 3 — EMPRESA Y ESTABLECIMIENTO
-- =====================================================================

CREATE TABLE actividad_economica (
    id      SERIAL PRIMARY KEY,
    codigo  VARCHAR(20) NOT NULL UNIQUE,
    nombre  VARCHAR(200) NOT NULL
);

CREATE TABLE empresa (
    id                      SERIAL PRIMARY KEY,
    uuid_local              UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    razon_social            VARCHAR(250) NOT NULL,
    nombre_comercial        VARCHAR(250),
    rnc                     VARCHAR(15)  NOT NULL UNIQUE,
    direccion               VARCHAR(400),
    municipio_id            INT REFERENCES municipio(id),
    telefono                VARCHAR(25),
    correo                  VARCHAR(150),
    actividad_economica_id  INT REFERENCES actividad_economica(id),
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usuario
    ADD CONSTRAINT fk_usuario_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);

CREATE TABLE establecimiento (
    id                          SERIAL PRIMARY KEY,
    uuid_local                  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    empresa_id                  INT NOT NULL REFERENCES empresa(id),
    nombre                      VARCHAR(250) NOT NULL,
    calle                       VARCHAR(300),
    municipio_id                INT REFERENCES municipio(id),
    dps_das_id                  SMALLINT REFERENCES dps_das(id),
    telefono                    VARCHAR(25),
    correo                      VARCHAR(150),
    rnc                         VARCHAR(15),
    fecha_inicio_operaciones    DATE,
    numero_permiso_sanitario    VARCHAR(50),
    fecha_vencimiento_permiso   DATE,
    produccion_anual            NUMERIC(14,2),
    unidad_produccion           VARCHAR(30),
    empleados_masculino         SMALLINT NOT NULL DEFAULT 0,
    empleados_femenino          SMALLINT NOT NULL DEFAULT 0,
    mercado_objetivo            VARCHAR(150),
    latitud                     NUMERIC(10,7),
    longitud                    NUMERIC(10,7),
    activo                      BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_empleados CHECK (empleados_masculino >= 0 AND empleados_femenino >= 0)
);
CREATE INDEX ix_estab_empresa ON establecimiento(empresa_id);
CREATE INDEX ix_estab_dps     ON establecimiento(dps_das_id);

CREATE TABLE tipo_contacto (
    id      SMALLSERIAL PRIMARY KEY,
    codigo  VARCHAR(25) NOT NULL UNIQUE,
    nombre  VARCHAR(60) NOT NULL
);

CREATE TABLE contacto (
    id                  SERIAL PRIMARY KEY,
    tipo_contacto_id    SMALLINT NOT NULL REFERENCES tipo_contacto(id),
    empresa_id          INT REFERENCES empresa(id) ON DELETE CASCADE,
    establecimiento_id  INT REFERENCES establecimiento(id) ON DELETE CASCADE,
    nombre_completo     VARCHAR(150) NOT NULL,
    documento_identidad VARCHAR(20),
    telefono            VARCHAR(25),
    celular             VARCHAR(25),
    correo              VARCHAR(150),
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    -- Un contacto pertenece a una empresa O a un establecimiento, nunca a ambos ni a ninguno
    CONSTRAINT ck_contacto_duenio CHECK (
        (empresa_id IS NOT NULL AND establecimiento_id IS NULL) OR
        (empresa_id IS NULL AND establecimiento_id IS NOT NULL)
    )
);


-- =====================================================================
-- MÓDULO 4 — CATÁLOGO DE RIESGO
-- Fuentes: Matriz_Riesgo_Alimentos.xlsx
--          Hoja_de_Cálculo_Categorización_Establecimiento_y_Frecuencia.xlsx
-- =====================================================================

CREATE TABLE nivel_riesgo (
    id              SMALLSERIAL PRIMARY KEY,
    codigo          VARCHAR(10)  NOT NULL UNIQUE,   -- BAJO | MEDIO | ALTO
    nombre          VARCHAR(50)  NOT NULL,
    puntaje_matriz  NUMERIC(4,2) NOT NULL,          -- 2 | 4 | 8
    puntaje_rp      NUMERIC(4,2) NOT NULL,          -- 1 | 2 | 3
    color_hex       CHAR(7),
    orden           SMALLINT     NOT NULL,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE  nivel_riesgo IS
  'Reconcilia las dos escalas del dominio: la matriz de alimentos usa 2/4/8 y la hoja de frecuencia usa 1/2/3 para los mismos tres niveles conceptuales';
COMMENT ON COLUMN nivel_riesgo.puntaje_matriz IS
  'Fuente: Matriz_Riesgo_Alimentos.xlsx, fórmula IFS de la columna D';
COMMENT ON COLUMN nivel_riesgo.puntaje_rp IS
  'Fuente: Hoja Frecuencia Inspección, filas 14-16';

CREATE TABLE categoria_alimento (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(250) NOT NULL UNIQUE,
    orden   SMALLINT NOT NULL DEFAULT 0,
    activo  BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE subcategoria_alimento (
    id                              SERIAL PRIMARY KEY,
    categoria_id                    INT NOT NULL REFERENCES categoria_alimento(id),
    nombre                          VARCHAR(500) NOT NULL,
    nivel_riesgo_microbiologico_id  SMALLINT REFERENCES nivel_riesgo(id),
    nivel_riesgo_quimico_id         SMALLINT REFERENCES nivel_riesgo(id),
    riesgo_total_calculado          NUMERIC(5,2),
    nivel_riesgo_resultante_id      SMALLINT REFERENCES nivel_riesgo(id),
    requiere_revision               BOOLEAN NOT NULL DEFAULT FALSE,
    nota_revision                   VARCHAR(300),
    activo                          BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_subcategoria UNIQUE (categoria_id, nombre)
);
CREATE INDEX ix_subcat_categoria ON subcategoria_alimento(categoria_id);
COMMENT ON COLUMN subcategoria_alimento.riesgo_total_calculado IS
  'Desnormalización D-04: promedio de los puntajes microbiológico y químico. Se conserva el valor importado para poder contrastarlo con el recalculado';
COMMENT ON COLUMN subcategoria_alimento.requiere_revision IS
  'TRUE en las subcategorías sin nivel de riesgo en el archivo fuente (defecto D-03)';

CREATE TABLE establecimiento_categoria (
    id                        SERIAL PRIMARY KEY,
    establecimiento_id        INT NOT NULL REFERENCES establecimiento(id) ON DELETE CASCADE,
    subcategoria_alimento_id  INT NOT NULL REFERENCES subcategoria_alimento(id),
    fecha_registro            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activo                    BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_estab_subcat UNIQUE (establecimiento_id, subcategoria_alimento_id)
);

CREATE TABLE version_matriz_riesgo (
    id                    SERIAL PRIMARY KEY,
    numero_version        VARCHAR(20)  NOT NULL,
    nombre                VARCHAR(200) NOT NULL,
    fecha_vigencia_desde  DATE NOT NULL,
    fecha_vigencia_hasta  DATE,
    estado                VARCHAR(15) NOT NULL DEFAULT 'BORRADOR'
                          CHECK (estado IN ('BORRADOR','PUBLICADA','ARCHIVADA')),
    usuario_publica_id    INT REFERENCES usuario(id),
    fecha_publicacion     TIMESTAMPTZ,
    CONSTRAINT uq_version_matriz UNIQUE (numero_version)
);

CREATE TABLE factor_riesgo_establecimiento (
    id                 SERIAL PRIMARY KEY,
    version_matriz_id  INT NOT NULL REFERENCES version_matriz_riesgo(id) ON DELETE CASCADE,
    numero             SMALLINT NOT NULL,
    nombre             VARCHAR(250) NOT NULL,
    peso               NUMERIC(6,4) NOT NULL CHECK (peso > 0 AND peso <= 1),
    es_automatico      BOOLEAN NOT NULL DEFAULT FALSE,
    fuente_automatica  VARCHAR(60),
    orden              SMALLINT NOT NULL,
    CONSTRAINT uq_factor UNIQUE (version_matriz_id, numero)
);
COMMENT ON COLUMN factor_riesgo_establecimiento.es_automatico IS
  'TRUE en el factor 3 (Cumplimiento BPM): su opción se deriva del porcentaje de cumplimiento de la evaluación, no se digita';

CREATE TABLE opcion_factor (
    id           SERIAL PRIMARY KEY,
    factor_id    INT NOT NULL REFERENCES factor_riesgo_establecimiento(id) ON DELETE CASCADE,
    descripcion  VARCHAR(400) NOT NULL,
    puntaje      NUMERIC(4,2) NOT NULL CHECK (puntaje BETWEEN 1 AND 3),
    limite_inf   NUMERIC(6,2),
    limite_sup   NUMERIC(6,2),
    orden        SMALLINT NOT NULL
);
CREATE INDEX ix_opcion_factor ON opcion_factor(factor_id);
COMMENT ON COLUMN opcion_factor.limite_inf IS
  'Solo para factores automáticos: rango de porcentaje que mapea a esta opción';

CREATE TABLE rango_frecuencia (
    id                   SERIAL PRIMARY KEY,
    version_matriz_id    INT NOT NULL REFERENCES version_matriz_riesgo(id) ON DELETE CASCADE,
    limite_inferior      NUMERIC(5,2) NOT NULL,
    limite_superior      NUMERIC(5,2),
    incluye_inferior     BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_superior     BOOLEAN NOT NULL DEFAULT TRUE,
    nivel_riesgo_id      SMALLINT NOT NULL REFERENCES nivel_riesgo(id),
    frecuencia           VARCHAR(20) NOT NULL,
    meses_hasta_proxima  SMALLINT NOT NULL CHECK (meses_hasta_proxima > 0),
    orden                SMALLINT NOT NULL
);
COMMENT ON TABLE rango_frecuencia IS
  'Matriz de Frecuencia de Inspección. Fuente: Hoja Frecuencia Inspección, filas 38-41';

CREATE TABLE rango_nivel_riesgo (
    id                 SERIAL PRIMARY KEY,
    version_matriz_id  INT NOT NULL REFERENCES version_matriz_riesgo(id) ON DELETE CASCADE,
    limite_inferior    NUMERIC(5,2) NOT NULL,
    limite_superior    NUMERIC(5,2) NOT NULL,
    nivel_riesgo_id    SMALLINT NOT NULL REFERENCES nivel_riesgo(id),
    es_supuesto        BOOLEAN NOT NULL DEFAULT FALSE,
    nota               VARCHAR(400),
    orden              SMALLINT NOT NULL
);
COMMENT ON TABLE rango_nivel_riesgo IS
  'AMBIGÜEDAD A-01: convierte el riesgo total de la matriz de alimentos (escala 2-8) al nivel Bajo/Medio/Alto. Esta regla NO aparece en los archivos fuente. es_supuesto=TRUE mientras la DIGEMAPS no la confirme';


-- =====================================================================
-- MÓDULO 5 — CATÁLOGO DE LA FICHA BPM
-- Fuente: Ficha_Inspección_BPM_Revisión_Final_23-09-24.xlsx
-- =====================================================================

CREATE TABLE version_ficha (
    id                            SERIAL PRIMARY KEY,
    numero_version                VARCHAR(20)  NOT NULL UNIQUE,
    nombre                        VARCHAR(250) NOT NULL,
    fecha_vigencia_desde          DATE NOT NULL,
    fecha_vigencia_hasta          DATE,
    estado                        VARCHAR(15) NOT NULL DEFAULT 'BORRADOR'
                                  CHECK (estado IN ('BORRADOR','PUBLICADA','ARCHIVADA')),
    total_items_evaluables        SMALLINT     NOT NULL DEFAULT 0,
    puntaje_total_posible         NUMERIC(6,2) NOT NULL DEFAULT 0,
    -- Regla de calificación, versionada junto a la ficha
    porcentaje_minimo_aprobacion  NUMERIC(5,2) NOT NULL DEFAULT 60,
    max_nc_criticas               SMALLINT     NOT NULL DEFAULT 1,
    max_nc_mayores                SMALLINT     NOT NULL DEFAULT 5,
    porcentaje_permiso_sanitario  NUMERIC(5,2) NOT NULL DEFAULT 81,
    usuario_publica_id            INT REFERENCES usuario(id),
    fecha_publicacion             TIMESTAMPTZ
);
COMMENT ON COLUMN version_ficha.max_nc_criticas IS
  'Regla original: IF(NC_Criticas > 1, "No aprueba"). El umbral es dato, no constante';

CREATE TABLE nivel_criticidad (
    id      SMALLSERIAL PRIMARY KEY,
    codigo  VARCHAR(3)  NOT NULL UNIQUE,    -- C | M | Me
    nombre  VARCHAR(40) NOT NULL,
    orden   SMALLINT    NOT NULL
);

CREATE TABLE item_ficha (
    id                SERIAL PRIMARY KEY,
    version_ficha_id  INT NOT NULL REFERENCES version_ficha(id) ON DELETE CASCADE,
    id_padre          INT REFERENCES item_ficha(id),
    numeracion        VARCHAR(20)  NOT NULL,
    titulo            TEXT         NOT NULL,
    nivel             SMALLINT     NOT NULL CHECK (nivel BETWEEN 1 AND 10),
    orden             SMALLINT     NOT NULL,
    es_evaluable      BOOLEAN      NOT NULL DEFAULT FALSE,
    peso              NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (peso > 0),
    criticidad_id     SMALLINT     REFERENCES nivel_criticidad(id),
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_no_autopadre CHECK (id_padre IS NULL OR id_padre <> id),
    CONSTRAINT uq_numeracion   UNIQUE (version_ficha_id, numeracion)
);
CREATE INDEX ix_item_padre   ON item_ficha(id_padre);
CREATE INDEX ix_item_version ON item_ficha(version_ficha_id);
CREATE INDEX ix_item_eval    ON item_ficha(version_ficha_id) WHERE es_evaluable;

COMMENT ON TABLE item_ficha IS
  'Jerarquía auto-referenciada. Sustituye el enfoque de una tabla por nivel: soporta profundidad arbitraria sin cambios de esquema';
COMMENT ON COLUMN item_ficha.numeracion IS
  'Desnormalización D-05: derivable recorriendo id_padre, pero es el identificador legal de la ficha en papel';
COMMENT ON COLUMN item_ficha.peso IS
  'Hoy 1.00 en los 45 ítems evaluables. Existe porque la DIGEMAPS exigió poder aumentar o reducir el valor de una pregunta sin modificar el sistema';

CREATE TABLE literal_item (
    id             SERIAL PRIMARY KEY,
    item_ficha_id  INT NOT NULL REFERENCES item_ficha(id) ON DELETE CASCADE,
    letra          VARCHAR(5),
    texto          TEXT NOT NULL,
    orden          SMALLINT NOT NULL
);
CREATE INDEX ix_literal_item ON literal_item(item_ficha_id);
COMMENT ON TABLE literal_item IS
  'Sub-literales a), b), c) bajo cada ítem evaluable. Son texto guía para el inspector; la respuesta se marca a nivel del ítem';

CREATE TABLE opcion_respuesta (
    id                   SMALLSERIAL PRIMARY KEY,
    version_ficha_id     INT NOT NULL REFERENCES version_ficha(id) ON DELETE CASCADE,
    codigo               VARCHAR(5)   NOT NULL,
    nombre               VARCHAR(60)  NOT NULL,
    valor                NUMERIC(5,2) NOT NULL,
    excluye_del_calculo  BOOLEAN      NOT NULL DEFAULT FALSE,
    genera_nc            BOOLEAN      NOT NULL DEFAULT FALSE,
    color_hex            CHAR(7),
    orden                SMALLINT     NOT NULL,
    CONSTRAINT uq_opcion_resp UNIQUE (version_ficha_id, codigo)
);
COMMENT ON COLUMN opcion_respuesta.valor IS
  'C=1.0, CP=0.5, IT=0.0, N/A=0.0. Fuente: IFS(P="Si",1, Q="Si",0.5, R="Si",0, S="Si","N/A")';
COMMENT ON COLUMN opcion_respuesta.excluye_del_calculo IS
  'TRUE solo en N/A. Saca el ítem del DENOMINADOR; no lo cuenta como cero';

CREATE TABLE rango_calificacion (
    id                SERIAL PRIMARY KEY,
    version_ficha_id  INT NOT NULL REFERENCES version_ficha(id) ON DELETE CASCADE,
    limite_inferior   NUMERIC(5,2) NOT NULL,
    limite_superior   NUMERIC(5,2) NOT NULL,
    incluye_inferior  BOOLEAN NOT NULL DEFAULT FALSE,
    incluye_superior  BOOLEAN NOT NULL DEFAULT TRUE,
    descripcion       VARCHAR(120) NOT NULL,
    accion            VARCHAR(150) NOT NULL,
    orden             SMALLINT NOT NULL
);
COMMENT ON TABLE rango_calificacion IS
  'Criterios de calificación. Fuente: Ficha Inspección BPM, filas 198-201';


-- =====================================================================
-- MÓDULO 6 — ORIGEN DE CASOS
-- =====================================================================

CREATE TABLE origen_caso (
    id      SMALLSERIAL PRIMARY KEY,
    codigo  VARCHAR(30) NOT NULL UNIQUE,
    nombre  VARCHAR(120) NOT NULL,
    orden   SMALLINT NOT NULL
);

CREATE TABLE solicitud_bpm (
    id                    SERIAL PRIMARY KEY,
    uuid_local            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    numero_solicitud      VARCHAR(30) NOT NULL UNIQUE,
    empresa_id            INT NOT NULL REFERENCES empresa(id),
    establecimiento_id    INT NOT NULL REFERENCES establecimiento(id),
    tipo_establecimiento  VARCHAR(120),
    motivo                VARCHAR(400) NOT NULL,
    observaciones         TEXT,
    estado                VARCHAR(30) NOT NULL DEFAULT 'BORRADOR'
                          CHECK (estado IN ('BORRADOR','PENDIENTE_ASIGNACION','ASIGNADA','RECHAZADA','CERRADA')),
    usuario_solicita_id   INT NOT NULL REFERENCES usuario(id),
    fecha_creacion        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_envio           TIMESTAMPTZ
);

CREATE TABLE alerta_lapch (
    id                  SERIAL PRIMARY KEY,
    numero_alerta       VARCHAR(40) NOT NULL UNIQUE,
    fecha_alerta        DATE NOT NULL,
    producto            VARCHAR(300) NOT NULL,
    empresa_id          INT REFERENCES empresa(id),
    establecimiento_id  INT REFERENCES establecimiento(id),
    descripcion         TEXT NOT NULL,
    resultado           VARCHAR(20) CHECK (resultado IN ('PROCEDE','NO_PROCEDE')),
    motivo_resultado    VARCHAR(400),
    usuario_registra_id INT NOT NULL REFERENCES usuario(id),
    fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cerrada             BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE denuncia (
    id                  SERIAL PRIMARY KEY,
    numero_denuncia     VARCHAR(40) NOT NULL UNIQUE,
    tipo_denuncia       VARCHAR(120) NOT NULL,
    fecha_recepcion     DATE NOT NULL,
    denunciante         VARCHAR(200),
    contacto_denunciante VARCHAR(150),
    es_anonima          BOOLEAN NOT NULL DEFAULT FALSE,
    establecimiento_id  INT REFERENCES establecimiento(id),
    descripcion         TEXT NOT NULL,
    resultado           VARCHAR(25) CHECK (resultado IN ('PROCEDE','NO_PROCEDE','REMISION')),
    proceso_remision    VARCHAR(200),
    usuario_registra_id INT NOT NULL REFERENCES usuario(id),
    fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE programacion_institucional (
    id                     SERIAL PRIMARY KEY,
    establecimiento_id     INT NOT NULL REFERENCES establecimiento(id),
    evaluacion_origen_id   INT,                       -- FK diferida (módulo 7)
    fecha_programada       DATE NOT NULL,
    frecuencia_aplicada    VARCHAR(20) NOT NULL,
    generada_automatica    BOOLEAN NOT NULL DEFAULT TRUE,
    prioridad              VARCHAR(15) NOT NULL DEFAULT 'NORMAL'
                           CHECK (prioridad IN ('BAJA','NORMAL','ALTA','URGENTE')),
    observaciones          TEXT,
    fecha_creacion         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE programacion_institucional IS
  'Cierra el ciclo: la frecuencia calculada en una evaluación genera la programación de la siguiente';

CREATE TABLE caso (
    id                             SERIAL PRIMARY KEY,
    uuid_local                     UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    numero_caso                    VARCHAR(30) NOT NULL UNIQUE,
    origen_caso_id                 SMALLINT NOT NULL REFERENCES origen_caso(id),
    establecimiento_id             INT NOT NULL REFERENCES establecimiento(id),
    solicitud_bpm_id               INT REFERENCES solicitud_bpm(id),
    programacion_institucional_id  INT REFERENCES programacion_institucional(id),
    alerta_lapch_id                INT REFERENCES alerta_lapch(id),
    denuncia_id                    INT REFERENCES denuncia(id),
    prioridad                      VARCHAR(15) NOT NULL DEFAULT 'NORMAL'
                                   CHECK (prioridad IN ('BAJA','NORMAL','ALTA','URGENTE')),
    estado                         VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE_ASIGNACION',
    fecha_apertura                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_cierre                   TIMESTAMPTZ,
    -- Exactamente uno de los cuatro orígenes debe estar presente
    CONSTRAINT ck_origen_unico CHECK (
        (CASE WHEN solicitud_bpm_id              IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN programacion_institucional_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN alerta_lapch_id               IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN denuncia_id                   IS NOT NULL THEN 1 ELSE 0 END) = 1
    )
);
CREATE INDEX ix_caso_estab  ON caso(establecimiento_id);
CREATE INDEX ix_caso_estado ON caso(estado);


-- =====================================================================
-- MÓDULO 7 — EVALUACIÓN Y CÁLCULO
-- =====================================================================

CREATE TABLE estado_evaluacion (
    id            SMALLSERIAL PRIMARY KEY,
    codigo        VARCHAR(30) NOT NULL UNIQUE,
    nombre        VARCHAR(80) NOT NULL,
    es_final      BOOLEAN NOT NULL DEFAULT FALSE,
    bloquea_datos BOOLEAN NOT NULL DEFAULT FALSE,
    orden         SMALLINT NOT NULL
);

CREATE TABLE evaluacion (
    id                  SERIAL PRIMARY KEY,
    uuid_local          UUID NOT NULL UNIQUE,
    numero_evaluacion   VARCHAR(30) NOT NULL UNIQUE,
    caso_id             INT NOT NULL REFERENCES caso(id),
    establecimiento_id  INT NOT NULL REFERENCES establecimiento(id),
    evaluador_id        INT REFERENCES usuario(id),
    coordinador_id      INT REFERENCES usuario(id),
    version_ficha_id    INT NOT NULL REFERENCES version_ficha(id),
    version_matriz_id   INT NOT NULL REFERENCES version_matriz_riesgo(id),
    estado_id           SMALLINT NOT NULL REFERENCES estado_evaluacion(id),
    fecha_programada    DATE,
    fecha_inicio        TIMESTAMPTZ,
    fecha_finalizacion  TIMESTAMPTZ,
    fecha_envio         TIMESTAMPTZ,
    fecha_revision      TIMESTAMPTZ,
    fecha_cierre        TIMESTAMPTZ,
    bloqueada           BOOLEAN NOT NULL DEFAULT FALSE,
    version_registro    INT NOT NULL DEFAULT 1,
    latitud             NUMERIC(10,7),
    longitud            NUMERIC(10,7),
    observaciones       TEXT,
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_eval_estab     ON evaluacion(establecimiento_id);
CREATE INDEX ix_eval_evaluador ON evaluacion(evaluador_id);
CREATE INDEX ix_eval_estado    ON evaluacion(estado_id);
COMMENT ON COLUMN evaluacion.uuid_local IS
  'Generado en el cliente. Base de la idempotencia: reenviar la misma evaluación no la duplica';
COMMENT ON COLUMN evaluacion.version_registro IS
  'Control optimista de concurrencia para la sincronización offline';

ALTER TABLE programacion_institucional
    ADD CONSTRAINT fk_prog_eval_origen
    FOREIGN KEY (evaluacion_origen_id) REFERENCES evaluacion(id);

CREATE TABLE asignacion_evaluador (
    id              SERIAL PRIMARY KEY,
    evaluacion_id   INT NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
    evaluador_id    INT NOT NULL REFERENCES usuario(id),
    asignado_por_id INT NOT NULL REFERENCES usuario(id),
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    es_reasignacion BOOLEAN NOT NULL DEFAULT FALSE,
    motivo          VARCHAR(400),
    activa          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE historial_estado (
    id             BIGSERIAL PRIMARY KEY,
    evaluacion_id  INT NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
    estado_origen_id SMALLINT REFERENCES estado_evaluacion(id),
    estado_destino_id SMALLINT NOT NULL REFERENCES estado_evaluacion(id),
    usuario_id     INT NOT NULL REFERENCES usuario(id),
    comentario     TEXT,
    fecha_hora     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_hist_eval ON historial_estado(evaluacion_id);

CREATE TABLE respuesta_item (
    id                   BIGSERIAL PRIMARY KEY,
    uuid_local           UUID NOT NULL UNIQUE,
    evaluacion_id        INT NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
    item_ficha_id        INT NOT NULL REFERENCES item_ficha(id),
    opcion_respuesta_id  SMALLINT NOT NULL REFERENCES opcion_respuesta(id),
    valor_aplicado       NUMERIC(5,2) NOT NULL,
    peso_aplicado        NUMERIC(5,2) NOT NULL,
    excluido_del_calculo BOOLEAN NOT NULL,
    criticidad_id        SMALLINT REFERENCES nivel_criticidad(id),
    observacion          TEXT,
    fecha_captura        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sincronizado         BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_respuesta_item UNIQUE (evaluacion_id, item_ficha_id)
);
CREATE INDEX ix_resp_eval ON respuesta_item(evaluacion_id);
COMMENT ON COLUMN respuesta_item.valor_aplicado IS
  'Desnormalización D-01: congela el valor vigente al responder. Si mañana CP pasa de 0.5 a 0.6, esta evaluación conserva su cálculo';

CREATE TABLE evidencia (
    id                BIGSERIAL PRIMARY KEY,
    uuid_local        UUID NOT NULL UNIQUE,
    evaluacion_id     INT NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
    respuesta_item_id BIGINT REFERENCES respuesta_item(id) ON DELETE CASCADE,
    tipo              VARCHAR(15) NOT NULL CHECK (tipo IN ('FOTO','DOCUMENTO','VIDEO')),
    nombre_archivo    VARCHAR(250) NOT NULL,
    ruta_almacenamiento VARCHAR(500),
    tipo_mime         VARCHAR(100),
    tamano_bytes      BIGINT,
    hash_sha256       CHAR(64),
    latitud           NUMERIC(10,7),
    longitud          NUMERIC(10,7),
    comentario        TEXT,
    fecha_captura     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sincronizado      BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ix_evid_eval ON evidencia(evaluacion_id);
CREATE INDEX ix_evid_pend ON evidencia(evaluacion_id) WHERE NOT sincronizado;

CREATE TABLE medida_correctiva (
    id             SERIAL PRIMARY KEY,
    evaluacion_id  INT NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
    numero         SMALLINT NOT NULL,
    detalle        TEXT NOT NULL,
    plazo_dias     SMALLINT,
    fecha_limite   DATE,
    cumplida       BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_medida UNIQUE (evaluacion_id, numero)
);
COMMENT ON TABLE medida_correctiva IS
  'Sustituye el grupo repetitivo de 10 filas fijas del Excel. Sin límite artificial';

CREATE TABLE evaluacion_participante (
    id             SERIAL PRIMARY KEY,
    evaluacion_id  INT NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
    tipo           VARCHAR(30) NOT NULL
                   CHECK (tipo IN ('OFICIAL_DPS_DAS','TECNICO_DIGEMAPS','REPRESENTANTE_EMPRESA')),
    usuario_id     INT REFERENCES usuario(id),
    nombre_completo VARCHAR(150) NOT NULL,
    documento_identidad VARCHAR(20),
    firma_ruta     VARCHAR(500),
    fecha_firma    TIMESTAMPTZ
);

CREATE TABLE evaluacion_factor_riesgo (
    id                SERIAL PRIMARY KEY,
    evaluacion_id     INT NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
    factor_id         INT NOT NULL REFERENCES factor_riesgo_establecimiento(id),
    opcion_factor_id  INT NOT NULL REFERENCES opcion_factor(id),
    puntaje_aplicado  NUMERIC(4,2) NOT NULL,
    peso_aplicado     NUMERIC(6,4) NOT NULL,
    aporte            NUMERIC(8,4) NOT NULL,
    CONSTRAINT uq_eval_factor UNIQUE (evaluacion_id, factor_id)
);
COMMENT ON TABLE evaluacion_factor_riesgo IS
  'Los 6 factores se registran POR EVALUACIÓN, no en el establecimiento: cambian con el tiempo y el RE de 2024 debe reflejar el estado de 2024';

CREATE TABLE calculo_riesgo (
    id                        SERIAL PRIMARY KEY,
    evaluacion_id             INT NOT NULL UNIQUE REFERENCES evaluacion(id) ON DELETE CASCADE,
    -- Cumplimiento
    puntos_obtenidos          NUMERIC(8,2) NOT NULL,
    puntos_excluidos_na       NUMERIC(8,2) NOT NULL,
    puntaje_total_posible     NUMERIC(8,2) NOT NULL,
    denominador_efectivo      NUMERIC(8,2) NOT NULL,
    porcentaje_cumplimiento   NUMERIC(5,2) NOT NULL,
    items_respondidos         SMALLINT NOT NULL,
    items_na                  SMALLINT NOT NULL,
    -- No conformidades
    nc_criticas               SMALLINT NOT NULL DEFAULT 0,
    nc_mayores                SMALLINT NOT NULL DEFAULT 0,
    nc_menores                SMALLINT NOT NULL DEFAULT 0,
    rango_calificacion_id     INT REFERENCES rango_calificacion(id),
    calificacion_texto        VARCHAR(200) NOT NULL,
    aprueba                   BOOLEAN NOT NULL,
    otorga_permiso_sanitario  BOOLEAN NOT NULL DEFAULT FALSE,
    -- Motor de riesgo
    rp_valor                  NUMERIC(5,2) NOT NULL,
    rp_subcategoria_id        INT REFERENCES subcategoria_alimento(id),
    rp_nivel_riesgo_id        SMALLINT REFERENCES nivel_riesgo(id),
    re_valor                  NUMERIC(8,4) NOT NULL,
    re_detalle                JSONB NOT NULL,
    rt_valor                  NUMERIC(8,4) NOT NULL,
    nivel_riesgo_id           SMALLINT NOT NULL REFERENCES nivel_riesgo(id),
    rango_frecuencia_id       INT NOT NULL REFERENCES rango_frecuencia(id),
    frecuencia                VARCHAR(20) NOT NULL,
    fecha_proxima_inspeccion  DATE NOT NULL,
    -- Trazabilidad
    version_ficha_id          INT NOT NULL REFERENCES version_ficha(id),
    version_matriz_id         INT NOT NULL REFERENCES version_matriz_riesgo(id),
    calculado_en_cliente      BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_calculo             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_denominador CHECK (denominador_efectivo > 0),
    CONSTRAINT ck_porcentaje  CHECK (porcentaje_cumplimiento BETWEEN 0 AND 100)
);
COMMENT ON TABLE calculo_riesgo IS
  'Desnormalización D-03: snapshot inmutable del resultado. Es el número con el que se programa una inspección oficial; debe ser reproducible aunque cambien los catálogos';
COMMENT ON COLUMN calculo_riesgo.re_detalle IS
  'Desglose de los 6 factores: [{numero, factor, opcion, puntaje, peso, aporte}]. Permite auditar el RE sin recalcular';


-- =====================================================================
-- MÓDULO 8 — SOPORTE, SINCRONIZACIÓN Y AUDITORÍA
-- =====================================================================

CREATE TABLE documento (
    id                  SERIAL PRIMARY KEY,
    uuid_local          UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    nombre_archivo      VARCHAR(250) NOT NULL,
    ruta_almacenamiento VARCHAR(500) NOT NULL,
    tipo_mime           VARCHAR(100),
    tamano_bytes        BIGINT,
    hash_sha256         CHAR(64),
    subido_por_id       INT REFERENCES usuario(id),
    fecha_subida        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usuario
    ADD CONSTRAINT fk_usuario_carta FOREIGN KEY (carta_autorizacion_id) REFERENCES documento(id);

CREATE TABLE notificacion (
    id             BIGSERIAL PRIMARY KEY,
    usuario_id     INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    tipo           VARCHAR(50) NOT NULL,
    titulo         VARCHAR(200) NOT NULL,
    mensaje        TEXT NOT NULL,
    entidad        VARCHAR(50),
    entidad_id     INT,
    url_destino    VARCHAR(300),
    leida          BOOLEAN NOT NULL DEFAULT FALSE,
    enviada_correo BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_lectura  TIMESTAMPTZ
);
CREATE INDEX ix_notif_usuario ON notificacion(usuario_id) WHERE NOT leida;

CREATE TABLE auditoria (
    id                BIGSERIAL PRIMARY KEY,
    entidad           VARCHAR(60) NOT NULL,
    entidad_id        VARCHAR(40),
    accion            VARCHAR(60) NOT NULL,
    usuario_id        INT REFERENCES usuario(id),
    ip                INET,
    user_agent        VARCHAR(400),
    valores_anteriores JSONB,
    valores_nuevos    JSONB,
    fecha_hora        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_audit_entidad ON auditoria(entidad, entidad_id);
CREATE INDEX ix_audit_fecha   ON auditoria(fecha_hora DESC);

CREATE TABLE operacion_pendiente (
    id                   BIGSERIAL PRIMARY KEY,
    uuid_local           UUID NOT NULL UNIQUE,
    usuario_id           INT NOT NULL REFERENCES usuario(id),
    tipo_operacion       VARCHAR(20) NOT NULL CHECK (tipo_operacion IN ('CREATE','UPDATE','DELETE','UPLOAD')),
    entidad              VARCHAR(60) NOT NULL,
    payload              JSONB NOT NULL,
    estado               VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                         CHECK (estado IN ('PENDIENTE','PROCESANDO','COMPLETADA','FALLIDA','CONFLICTO')),
    intentos             SMALLINT NOT NULL DEFAULT 0,
    error_mensaje        TEXT,
    fecha_creacion_cliente TIMESTAMPTZ NOT NULL,
    fecha_recepcion      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_procesamiento  TIMESTAMPTZ
);
CREATE INDEX ix_oper_pend ON operacion_pendiente(estado, fecha_creacion_cliente);
COMMENT ON TABLE operacion_pendiente IS
  'Espejo servidor de la cola de sincronización del cliente. uuid_local garantiza idempotencia: reenviar no duplica';

CREATE TABLE importacion_excel (
    id                SERIAL PRIMARY KEY,
    tipo_fuente       VARCHAR(40) NOT NULL
                      CHECK (tipo_fuente IN ('FICHA_BPM','MATRIZ_ALIMENTOS','FACTORES_FRECUENCIA')),
    nombre_archivo    VARCHAR(250) NOT NULL,
    usuario_id        INT REFERENCES usuario(id),
    filas_leidas      INT NOT NULL DEFAULT 0,
    filas_importadas  INT NOT NULL DEFAULT 0,
    filas_rechazadas  INT NOT NULL DEFAULT 0,
    estado            VARCHAR(20) NOT NULL DEFAULT 'EN_PROCESO'
                      CHECK (estado IN ('EN_PROCESO','COMPLETADA','FALLIDA')),
    fecha_inicio      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin         TIMESTAMPTZ
);

CREATE TABLE importacion_detalle (
    id                BIGSERIAL PRIMARY KEY,
    importacion_id    INT NOT NULL REFERENCES importacion_excel(id) ON DELETE CASCADE,
    fila_origen       INT NOT NULL,
    resultado         VARCHAR(15) NOT NULL CHECK (resultado IN ('IMPORTADA','RECHAZADA','ADVERTENCIA')),
    motivo            VARCHAR(400),
    datos_originales  JSONB
);
CREATE INDEX ix_imp_det ON importacion_detalle(importacion_id, resultado);


-- =====================================================================
-- TRIGGERS DE INTEGRIDAD
-- =====================================================================

-- Los pesos de los 6 factores de una versión deben sumar 1.00
CREATE OR REPLACE FUNCTION fn_validar_suma_pesos() RETURNS TRIGGER AS $$
DECLARE
    v_version INT;
    v_total   NUMERIC(8,4);
BEGIN
    v_version := COALESCE(NEW.version_matriz_id, OLD.version_matriz_id);
    SELECT COALESCE(SUM(peso), 0) INTO v_total
      FROM factor_riesgo_establecimiento
     WHERE version_matriz_id = v_version;

    IF v_total > 1.0001 THEN
        RAISE EXCEPTION 'La suma de pesos de la versión % es % y no puede exceder 1.00', v_version, v_total;
    END IF;
    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_pesos
AFTER INSERT OR UPDATE OR DELETE ON factor_riesgo_establecimiento
FOR EACH ROW EXECUTE FUNCTION fn_validar_suma_pesos();


-- Impide ciclos en la jerarquía auto-referenciada de la ficha
CREATE OR REPLACE FUNCTION fn_validar_ciclo_item() RETURNS TRIGGER AS $$
DECLARE
    v_actual INT;
    v_saltos SMALLINT := 0;
BEGIN
    IF NEW.id_padre IS NULL THEN RETURN NEW; END IF;

    v_actual := NEW.id_padre;
    WHILE v_actual IS NOT NULL LOOP
        IF v_actual = NEW.id THEN
            RAISE EXCEPTION 'Ciclo detectado en item_ficha: el ítem % no puede ser su propio ancestro', NEW.id;
        END IF;
        v_saltos := v_saltos + 1;
        IF v_saltos > 20 THEN
            RAISE EXCEPTION 'Profundidad de jerarquía excesiva; posible ciclo';
        END IF;
        SELECT id_padre INTO v_actual FROM item_ficha WHERE id = v_actual;
    END LOOP;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_ciclo
BEFORE INSERT OR UPDATE OF id_padre ON item_ficha
FOR EACH ROW EXECUTE FUNCTION fn_validar_ciclo_item();


-- Una evaluación bloqueada no admite cambios en sus respuestas (RF-17)
CREATE OR REPLACE FUNCTION fn_validar_evaluacion_bloqueada() RETURNS TRIGGER AS $$
DECLARE v_bloqueada BOOLEAN;
BEGIN
    SELECT bloqueada INTO v_bloqueada
      FROM evaluacion
     WHERE id = COALESCE(NEW.evaluacion_id, OLD.evaluacion_id);

    IF v_bloqueada THEN
        RAISE EXCEPTION 'La evaluación está bloqueada tras su envío y no admite modificaciones';
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_eval_bloqueada
BEFORE INSERT OR UPDATE OR DELETE ON respuesta_item
FOR EACH ROW EXECUTE FUNCTION fn_validar_evaluacion_bloqueada();


-- Solo una versión publicada por catálogo a la vez
CREATE UNIQUE INDEX ux_version_ficha_publicada
    ON version_ficha (estado) WHERE estado = 'PUBLICADA';
CREATE UNIQUE INDEX ux_version_matriz_publicada
    ON version_matriz_riesgo (estado) WHERE estado = 'PUBLICADA';


-- =====================================================================
-- POLÍTICAS REALES DE ROW-LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE establecimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitud_bpm ENABLE ROW LEVEL SECURITY;
ALTER TABLE caso ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY empresa_select_policy ON empresa
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id::text = current_setting('app.current_empresa_id', true)
  );

CREATE POLICY empresa_update_policy ON empresa
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'ADMINISTRADOR_EMPRESA')
    AND (
      current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR')
      OR id::text = current_setting('app.current_empresa_id', true)
    )
  );

CREATE POLICY establecimiento_select_policy ON establecimiento
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id_empresa::text = current_setting('app.current_empresa_id', true)
  );

CREATE POLICY solicitud_bpm_select_policy ON solicitud_bpm
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id_empresa::text = current_setting('app.current_empresa_id', true)
  );

CREATE POLICY caso_select_policy ON caso
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id_establecimiento IN (
      SELECT id FROM establecimiento WHERE id_empresa::text = current_setting('app.current_empresa_id', true)
    )
  );

CREATE POLICY evaluacion_select_policy ON evaluacion
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR')
    OR (
      current_setting('app.current_user_role', true) IN ('EVALUADOR', 'TECNICO')
      AND id_evaluador::text = current_setting('app.current_user_id', true)
    )
    OR id_establecimiento IN (
      SELECT id FROM establecimiento WHERE id_empresa::text = current_setting('app.current_empresa_id', true)
    )
  );

CREATE POLICY auditoria_select_policy ON auditoria
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR')
  );

