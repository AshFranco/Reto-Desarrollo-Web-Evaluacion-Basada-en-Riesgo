-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "rol" (
    "id" SMALLSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "es_interno" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permiso" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "modulo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,

    CONSTRAINT "permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_permiso" (
    "id_rol" SMALLINT NOT NULL,
    "id_permiso" BIGINT NOT NULL,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("id_rol","id_permiso")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(255),
    "ip" INET,
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" BIGSERIAL NOT NULL,
    "id_empresa" BIGINT,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "cedula_pasaporte" VARCHAR(30) NOT NULL,
    "correo_electronico" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(20),
    "contrasena_hash" VARCHAR(255) NOT NULL,
    "doble_factor_activo" BOOLEAN NOT NULL DEFAULT false,
    "estado" VARCHAR(25) NOT NULL DEFAULT 'PENDIENTE_VALIDACION',
    "motivo_rechazo" VARCHAR(400),
    "intentos_fallidos" SMALLINT NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "id_usuario" BIGINT NOT NULL,
    "id_rol" SMALLINT NOT NULL,

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("id_usuario","id_rol")
);

-- CreateTable
CREATE TABLE "provincia" (
    "id" SMALLSERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,

    CONSTRAINT "provincia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipio" (
    "id" BIGSERIAL NOT NULL,
    "id_provincia" SMALLINT NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,

    CONSTRAINT "municipio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dps_das" (
    "id" SMALLSERIAL NOT NULL,
    "codigo" VARCHAR(15) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(5) NOT NULL,
    "id_provincia" SMALLINT,

    CONSTRAINT "dps_das_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa" (
    "id" BIGSERIAL NOT NULL,
    "id_municipio" BIGINT,
    "razon_social" VARCHAR(200) NOT NULL,
    "rnc" VARCHAR(20) NOT NULL,
    "nombre_comercial" VARCHAR(200),
    "direccion" VARCHAR(255),
    "telefono" VARCHAR(20),
    "correo" VARCHAR(150),
    "actividad_economica" VARCHAR(150),
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_contacto" (
    "id" SMALLSERIAL NOT NULL,
    "codigo" VARCHAR(25) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,

    CONSTRAINT "tipo_contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacto" (
    "id" BIGSERIAL NOT NULL,
    "id_tipo_contacto" SMALLINT NOT NULL,
    "id_empresa" BIGINT,
    "id_establecimiento" BIGINT,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "documento_identidad" VARCHAR(20),
    "telefono" VARCHAR(20),
    "celular" VARCHAR(20),
    "correo" VARCHAR(150),

    CONSTRAINT "contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "establecimiento" (
    "id" BIGSERIAL NOT NULL,
    "id_empresa" BIGINT NOT NULL,
    "id_municipio" BIGINT,
    "id_dps_das" SMALLINT,
    "nombre" VARCHAR(200) NOT NULL,
    "rnc" VARCHAR(20),
    "calle" VARCHAR(300),
    "telefono" VARCHAR(20),
    "correo" VARCHAR(150),
    "fecha_inicio_operaciones" DATE,
    "numero_permiso_sanitario" VARCHAR(50),
    "fecha_vencimiento_permiso" DATE,
    "produccion_anual" DECIMAL(14,2),
    "empleados_masculino" SMALLINT NOT NULL DEFAULT 0,
    "empleados_femenino" SMALLINT NOT NULL DEFAULT 0,
    "mercado_objetivo" VARCHAR(150),
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "establecimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_bpm" (
    "id" BIGSERIAL NOT NULL,
    "id_empresa" BIGINT NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "tipo_establecimiento" VARCHAR(100),
    "motivo" VARCHAR(255),
    "observaciones" TEXT,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'Pendiente de Asignacion',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_envio" TIMESTAMP(3),

    CONSTRAINT "solicitud_bpm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerta_lapch" (
    "id" BIGSERIAL NOT NULL,
    "id_empresa" BIGINT,
    "id_establecimiento" BIGINT,
    "numero_alerta" VARCHAR(50) NOT NULL,
    "fecha" DATE NOT NULL,
    "producto" VARCHAR(150),
    "descripcion" TEXT,
    "resultado" VARCHAR(20),

    CONSTRAINT "alerta_lapch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denuncia" (
    "id" BIGSERIAL NOT NULL,
    "id_empresa" BIGINT,
    "id_establecimiento" BIGINT,
    "tipo_denuncia" VARCHAR(100),
    "fecha_recepcion" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "denunciante" VARCHAR(150),
    "descripcion" TEXT,
    "resultado" VARCHAR(30),

    CONSTRAINT "denuncia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programacion_institucional" (
    "id" BIGSERIAL NOT NULL,
    "id_establecimiento" BIGINT NOT NULL,
    "id_evaluacion_origen" BIGINT,
    "fecha_programada" DATE NOT NULL,
    "frecuencia_aplicada" VARCHAR(20) NOT NULL,
    "generada_automatica" BOOLEAN NOT NULL DEFAULT true,
    "prioridad" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programacion_institucional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "origen_caso" (
    "id" SMALLSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "orden" SMALLINT NOT NULL,

    CONSTRAINT "origen_caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caso" (
    "id" BIGSERIAL NOT NULL,
    "id_establecimiento" BIGINT NOT NULL,
    "id_origen" SMALLINT,
    "id_solicitud" BIGINT,
    "id_alerta" BIGINT,
    "id_denuncia" BIGINT,
    "id_programacion" BIGINT,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    "prioridad" VARCHAR(20),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignacion_evaluador" (
    "id" BIGSERIAL NOT NULL,
    "id_caso" BIGINT NOT NULL,
    "id_evaluador" BIGINT NOT NULL,
    "id_coordinador" BIGINT NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prioridad" VARCHAR(20),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'Asignado',

    CONSTRAINT "asignacion_evaluador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nivel_riesgo" (
    "id" SMALLSERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "puntaje_matriz" DECIMAL(4,2) NOT NULL,
    "puntaje_rp" DECIMAL(4,2) NOT NULL,
    "color_hex" CHAR(7),
    "orden" SMALLINT NOT NULL,

    CONSTRAINT "nivel_riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nivel_criticidad" (
    "id" SMALLSERIAL NOT NULL,
    "codigo" VARCHAR(3) NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "orden" SMALLINT NOT NULL,

    CONSTRAINT "nivel_criticidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_ficha" (
    "id" BIGSERIAL NOT NULL,
    "numero_version" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(250),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'Activa',
    "fecha_vigencia_desde" DATE,
    "fecha_vigencia_hasta" DATE,
    "total_items_evaluables" SMALLINT NOT NULL DEFAULT 0,
    "puntaje_total_posible" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "porcentaje_permiso_sanitario" DECIMAL(5,2) NOT NULL DEFAULT 81,
    "porcentaje_minimo_aprobacion" DECIMAL(5,2),
    "max_nc_criticas" SMALLINT,
    "max_nc_mayores" SMALLINT,

    CONSTRAINT "version_ficha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rango_calificacion" (
    "id" BIGSERIAL NOT NULL,
    "id_version_ficha" BIGINT NOT NULL,
    "limite_inferior" DECIMAL(5,2) NOT NULL,
    "limite_superior" DECIMAL(5,2) NOT NULL,
    "incluye_inferior" BOOLEAN NOT NULL DEFAULT false,
    "incluye_superior" BOOLEAN NOT NULL DEFAULT true,
    "descripcion" VARCHAR(120) NOT NULL,
    "accion" VARCHAR(150) NOT NULL,
    "orden" SMALLINT NOT NULL,

    CONSTRAINT "rango_calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_ficha" (
    "id" BIGSERIAL NOT NULL,
    "id_version_ficha" BIGINT NOT NULL,
    "id_padre" BIGINT,
    "id_criticidad" SMALLINT,
    "numeracion" VARCHAR(20),
    "titulo" TEXT NOT NULL,
    "es_evaluable" BOOLEAN NOT NULL DEFAULT true,
    "peso" DECIMAL(6,2),
    "orden" SMALLINT NOT NULL DEFAULT 0,
    "nivel" SMALLINT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "item_ficha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion_respuesta" (
    "id" BIGSERIAL NOT NULL,
    "id_version_ficha" BIGINT NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "valor" DECIMAL(6,2),
    "excluye_del_calculo" BOOLEAN NOT NULL DEFAULT false,
    "genera_nc" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "opcion_respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_matriz_riesgo" (
    "id" BIGSERIAL NOT NULL,
    "numero_version" VARCHAR(20) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'Activa',

    CONSTRAINT "version_matriz_riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rango_nivel_riesgo" (
    "id" BIGSERIAL NOT NULL,
    "id_version_matriz" BIGINT NOT NULL,
    "id_nivel_riesgo" SMALLINT,
    "limite_inferior" DECIMAL(6,2) NOT NULL,
    "limite_superior" DECIMAL(6,2),
    "es_supuesto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rango_nivel_riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rango_frecuencia" (
    "id" BIGSERIAL NOT NULL,
    "id_version_matriz" BIGINT NOT NULL,
    "id_nivel_riesgo" SMALLINT,
    "limite_inferior" DECIMAL(6,2) NOT NULL,
    "limite_superior" DECIMAL(6,2),
    "frecuencia" VARCHAR(20) NOT NULL,
    "meses_hasta_proxima" SMALLINT,
    "incluye_inferior" BOOLEAN NOT NULL DEFAULT true,
    "incluye_superior" BOOLEAN NOT NULL DEFAULT true,
    "orden" SMALLINT,

    CONSTRAINT "rango_frecuencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factor_riesgo_establecimiento" (
    "id" BIGSERIAL NOT NULL,
    "id_version_matriz" BIGINT NOT NULL,
    "numero" SMALLINT,
    "nombre" VARCHAR(150) NOT NULL,
    "peso" DECIMAL(6,4),
    "es_automatico" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "factor_riesgo_establecimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion_factor" (
    "id" BIGSERIAL NOT NULL,
    "id_factor" BIGINT NOT NULL,
    "descripcion" VARCHAR(200),
    "puntaje" DECIMAL(6,2),
    "limite_inf" DECIMAL(6,2),
    "limite_sup" DECIMAL(6,2),
    "orden" SMALLINT,

    CONSTRAINT "opcion_factor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_alimento" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,

    CONSTRAINT "categoria_alimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategoria_alimento" (
    "id" BIGSERIAL NOT NULL,
    "id_categoria" BIGINT NOT NULL,
    "id_nivel_riesgo_microbiologico" SMALLINT,
    "id_nivel_riesgo_quimico" SMALLINT,
    "riesgo_total_calculado" DECIMAL(5,2),
    "id_nivel_riesgo_resultante" SMALLINT,
    "requiere_revision" BOOLEAN NOT NULL DEFAULT false,
    "nota_revision" VARCHAR(300),
    "nombre" VARCHAR(150) NOT NULL,

    CONSTRAINT "subcategoria_alimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "establecimiento_categoria" (
    "id" BIGSERIAL NOT NULL,
    "id_establecimiento" BIGINT NOT NULL,
    "id_subcategoria_alimento" BIGINT NOT NULL,

    CONSTRAINT "establecimiento_categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_evaluacion" (
    "id" SMALLSERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "es_final" BOOLEAN NOT NULL DEFAULT false,
    "bloquea_datos" BOOLEAN NOT NULL DEFAULT false,
    "orden" SMALLINT NOT NULL,

    CONSTRAINT "estado_evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluacion" (
    "id" BIGSERIAL NOT NULL,
    "uuid_local" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_caso" BIGINT NOT NULL,
    "id_establecimiento" BIGINT NOT NULL,
    "id_version_ficha" BIGINT NOT NULL,
    "id_version_matriz" BIGINT NOT NULL,
    "id_evaluador" BIGINT NOT NULL,
    "id_estado" SMALLINT,
    "id_coordinador" BIGINT,
    "bloqueada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_inicio" TIMESTAMP(3),
    "fecha_finalizacion" TIMESTAMP(3),
    "fecha_programada" DATE,
    "fecha_envio" TIMESTAMP(3),
    "fecha_revision" TIMESTAMP(3),
    "version_registro" INTEGER NOT NULL DEFAULT 1,
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),

    CONSTRAINT "evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estado" (
    "id" BIGSERIAL NOT NULL,
    "id_evaluacion" BIGINT NOT NULL,
    "id_estado_origen" SMALLINT,
    "id_estado_destino" SMALLINT NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "comentario" TEXT,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuesta_item" (
    "id" BIGSERIAL NOT NULL,
    "id_evaluacion" BIGINT NOT NULL,
    "id_item_ficha" BIGINT NOT NULL,
    "id_opcion_respuesta" BIGINT NOT NULL,
    "id_criticidad" SMALLINT,
    "valor_aplicado" DECIMAL(6,2),
    "peso_aplicado" DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    "excluido_del_calculo" BOOLEAN NOT NULL DEFAULT false,
    "observacion" TEXT,
    "uuid_local" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sincronizado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "respuesta_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculo_riesgo" (
    "id" BIGSERIAL NOT NULL,
    "id_evaluacion" BIGINT NOT NULL,
    "id_nivel_riesgo" SMALLINT,
    "id_subcategoria_rp" BIGINT,
    "id_rango_calificacion" BIGINT,
    "porcentaje_cumplimiento" DECIMAL(6,2),
    "rp_valor" DECIMAL(8,4),
    "re_valor" DECIMAL(8,4),
    "rt_valor" DECIMAL(8,4),
    "frecuencia" VARCHAR(20),
    "puntos_obtenidos" DECIMAL(8,2),
    "puntos_excluidos_na" DECIMAL(8,2),
    "puntaje_total_posible" DECIMAL(8,2),
    "denominador_efectivo" DECIMAL(8,2),
    "items_respondidos" SMALLINT,
    "items_na" SMALLINT,
    "calificacion_texto" VARCHAR(200),
    "aprueba" BOOLEAN,
    "otorga_permiso_sanitario" BOOLEAN NOT NULL DEFAULT false,
    "nc_criticas" SMALLINT NOT NULL DEFAULT 0,
    "nc_mayores" SMALLINT NOT NULL DEFAULT 0,
    "nc_menores" SMALLINT NOT NULL DEFAULT 0,
    "fecha_proxima_inspeccion" DATE,
    "fecha_calculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "re_detalle" JSONB,

    CONSTRAINT "calculo_riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluacion_factor_riesgo" (
    "id" BIGSERIAL NOT NULL,
    "id_evaluacion" BIGINT NOT NULL,
    "id_factor" BIGINT NOT NULL,
    "id_opcion_factor" BIGINT NOT NULL,
    "puntaje_aplicado" DECIMAL(6,2),
    "peso_aplicado" DECIMAL(6,4),
    "aporte" DECIMAL(8,4),

    CONSTRAINT "evaluacion_factor_riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medida_correctiva" (
    "id" BIGSERIAL NOT NULL,
    "id_evaluacion" BIGINT NOT NULL,
    "numero" SMALLINT NOT NULL,
    "detalle" TEXT NOT NULL,
    "plazo_dias" SMALLINT,
    "fecha_limite" DATE,
    "cumplida" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "medida_correctiva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencia" (
    "id" BIGSERIAL NOT NULL,
    "uuid_local" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_evaluacion" BIGINT NOT NULL,
    "id_respuesta_item" BIGINT,
    "tipo" VARCHAR(15) NOT NULL,
    "nombre_archivo" VARCHAR(250) NOT NULL,
    "ruta_almacenamiento" VARCHAR(500),
    "tipo_mime" VARCHAR(100),
    "tamano_bytes" BIGINT,
    "hash_sha256" CHAR(64),
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "comentario" TEXT,
    "fecha_captura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sincronizado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informe_evaluacion" (
    "id" BIGSERIAL NOT NULL,
    "id_evaluacion" BIGINT NOT NULL,
    "resumen_ejecutivo" TEXT,
    "hallazgos" TEXT,
    "no_conformidades" TEXT,
    "recomendaciones" TEXT,
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "informe_evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expediente" (
    "id" BIGSERIAL NOT NULL,
    "id_caso" BIGINT NOT NULL,
    "resultado_final" VARCHAR(100),
    "fecha_cierre" DATE,
    "informe_oficial_url" VARCHAR(255),
    "estado" VARCHAR(30) NOT NULL DEFAULT 'Abierto',

    CONSTRAINT "expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "entidad" VARCHAR(50),
    "id_entidad" BIGINT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "enviada_correo" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" BIGSERIAL NOT NULL,
    "entidad" VARCHAR(60) NOT NULL,
    "id_entidad" VARCHAR(40),
    "accion" VARCHAR(20) NOT NULL,
    "id_usuario" BIGINT,
    "ip" INET,
    "valores_anteriores" JSONB,
    "valores_nuevos" JSONB,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operacion_pendiente" (
    "id" BIGSERIAL NOT NULL,
    "uuid_local" UUID NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "tipo_operacion" VARCHAR(20) NOT NULL,
    "entidad" VARCHAR(60) NOT NULL,
    "payload" JSONB NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "intentos" SMALLINT NOT NULL DEFAULT 0,
    "error_mensaje" TEXT,
    "fecha_creacion_cliente" TIMESTAMP(3) NOT NULL,
    "fecha_recepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operacion_pendiente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rol_codigo_key" ON "rol"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "permiso_codigo_key" ON "permiso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_cedula_pasaporte_key" ON "usuario"("cedula_pasaporte");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_electronico_key" ON "usuario"("correo_electronico");

-- CreateIndex
CREATE UNIQUE INDEX "provincia_codigo_key" ON "provincia"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "municipio_codigo_key" ON "municipio"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "dps_das_codigo_key" ON "dps_das"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_rnc_key" ON "empresa"("rnc");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_contacto_codigo_key" ON "tipo_contacto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "alerta_lapch_numero_alerta_key" ON "alerta_lapch"("numero_alerta");

-- CreateIndex
CREATE UNIQUE INDEX "origen_caso_codigo_key" ON "origen_caso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "nivel_riesgo_codigo_key" ON "nivel_riesgo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "nivel_criticidad_codigo_key" ON "nivel_criticidad"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "establecimiento_categoria_id_establecimiento_id_subcategori_key" ON "establecimiento_categoria"("id_establecimiento", "id_subcategoria_alimento");

-- CreateIndex
CREATE UNIQUE INDEX "estado_evaluacion_codigo_key" ON "estado_evaluacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "respuesta_item_id_evaluacion_id_item_ficha_key" ON "respuesta_item"("id_evaluacion", "id_item_ficha");

-- CreateIndex
CREATE UNIQUE INDEX "respuesta_item_uuid_local_key" ON "respuesta_item"("uuid_local");

-- CreateIndex
CREATE UNIQUE INDEX "calculo_riesgo_id_evaluacion_key" ON "calculo_riesgo"("id_evaluacion");

-- CreateIndex
CREATE UNIQUE INDEX "medida_correctiva_id_evaluacion_numero_key" ON "medida_correctiva"("id_evaluacion", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "evidencia_uuid_local_key" ON "evidencia"("uuid_local");

-- CreateIndex
CREATE UNIQUE INDEX "informe_evaluacion_id_evaluacion_key" ON "informe_evaluacion"("id_evaluacion");

-- CreateIndex
CREATE UNIQUE INDEX "expediente_id_caso_key" ON "expediente"("id_caso");

-- CreateIndex
CREATE UNIQUE INDEX "operacion_pendiente_uuid_local_key" ON "operacion_pendiente"("uuid_local");

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_id_permiso_fkey" FOREIGN KEY ("id_permiso") REFERENCES "permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "municipio" ADD CONSTRAINT "municipio_id_provincia_fkey" FOREIGN KEY ("id_provincia") REFERENCES "provincia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dps_das" ADD CONSTRAINT "dps_das_id_provincia_fkey" FOREIGN KEY ("id_provincia") REFERENCES "provincia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_id_municipio_fkey" FOREIGN KEY ("id_municipio") REFERENCES "municipio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacto" ADD CONSTRAINT "contacto_id_tipo_contacto_fkey" FOREIGN KEY ("id_tipo_contacto") REFERENCES "tipo_contacto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacto" ADD CONSTRAINT "contacto_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacto" ADD CONSTRAINT "contacto_id_establecimiento_fkey" FOREIGN KEY ("id_establecimiento") REFERENCES "establecimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establecimiento" ADD CONSTRAINT "establecimiento_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establecimiento" ADD CONSTRAINT "establecimiento_id_municipio_fkey" FOREIGN KEY ("id_municipio") REFERENCES "municipio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establecimiento" ADD CONSTRAINT "establecimiento_id_dps_das_fkey" FOREIGN KEY ("id_dps_das") REFERENCES "dps_das"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_bpm" ADD CONSTRAINT "solicitud_bpm_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_bpm" ADD CONSTRAINT "solicitud_bpm_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_lapch" ADD CONSTRAINT "alerta_lapch_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_lapch" ADD CONSTRAINT "alerta_lapch_id_establecimiento_fkey" FOREIGN KEY ("id_establecimiento") REFERENCES "establecimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denuncia" ADD CONSTRAINT "denuncia_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denuncia" ADD CONSTRAINT "denuncia_id_establecimiento_fkey" FOREIGN KEY ("id_establecimiento") REFERENCES "establecimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacion_institucional" ADD CONSTRAINT "programacion_institucional_id_establecimiento_fkey" FOREIGN KEY ("id_establecimiento") REFERENCES "establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacion_institucional" ADD CONSTRAINT "programacion_institucional_id_evaluacion_origen_fkey" FOREIGN KEY ("id_evaluacion_origen") REFERENCES "evaluacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso" ADD CONSTRAINT "caso_id_establecimiento_fkey" FOREIGN KEY ("id_establecimiento") REFERENCES "establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso" ADD CONSTRAINT "caso_id_origen_fkey" FOREIGN KEY ("id_origen") REFERENCES "origen_caso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso" ADD CONSTRAINT "caso_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitud_bpm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso" ADD CONSTRAINT "caso_id_alerta_fkey" FOREIGN KEY ("id_alerta") REFERENCES "alerta_lapch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso" ADD CONSTRAINT "caso_id_denuncia_fkey" FOREIGN KEY ("id_denuncia") REFERENCES "denuncia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso" ADD CONSTRAINT "caso_id_programacion_fkey" FOREIGN KEY ("id_programacion") REFERENCES "programacion_institucional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_evaluador" ADD CONSTRAINT "asignacion_evaluador_id_caso_fkey" FOREIGN KEY ("id_caso") REFERENCES "caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_evaluador" ADD CONSTRAINT "asignacion_evaluador_id_evaluador_fkey" FOREIGN KEY ("id_evaluador") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_evaluador" ADD CONSTRAINT "asignacion_evaluador_id_coordinador_fkey" FOREIGN KEY ("id_coordinador") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rango_calificacion" ADD CONSTRAINT "rango_calificacion_id_version_ficha_fkey" FOREIGN KEY ("id_version_ficha") REFERENCES "version_ficha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_ficha" ADD CONSTRAINT "item_ficha_id_version_ficha_fkey" FOREIGN KEY ("id_version_ficha") REFERENCES "version_ficha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_ficha" ADD CONSTRAINT "item_ficha_id_padre_fkey" FOREIGN KEY ("id_padre") REFERENCES "item_ficha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_ficha" ADD CONSTRAINT "item_ficha_id_criticidad_fkey" FOREIGN KEY ("id_criticidad") REFERENCES "nivel_criticidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_respuesta" ADD CONSTRAINT "opcion_respuesta_id_version_ficha_fkey" FOREIGN KEY ("id_version_ficha") REFERENCES "version_ficha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rango_nivel_riesgo" ADD CONSTRAINT "rango_nivel_riesgo_id_version_matriz_fkey" FOREIGN KEY ("id_version_matriz") REFERENCES "version_matriz_riesgo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rango_nivel_riesgo" ADD CONSTRAINT "rango_nivel_riesgo_id_nivel_riesgo_fkey" FOREIGN KEY ("id_nivel_riesgo") REFERENCES "nivel_riesgo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rango_frecuencia" ADD CONSTRAINT "rango_frecuencia_id_version_matriz_fkey" FOREIGN KEY ("id_version_matriz") REFERENCES "version_matriz_riesgo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rango_frecuencia" ADD CONSTRAINT "rango_frecuencia_id_nivel_riesgo_fkey" FOREIGN KEY ("id_nivel_riesgo") REFERENCES "nivel_riesgo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factor_riesgo_establecimiento" ADD CONSTRAINT "factor_riesgo_establecimiento_id_version_matriz_fkey" FOREIGN KEY ("id_version_matriz") REFERENCES "version_matriz_riesgo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_factor" ADD CONSTRAINT "opcion_factor_id_factor_fkey" FOREIGN KEY ("id_factor") REFERENCES "factor_riesgo_establecimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategoria_alimento" ADD CONSTRAINT "subcategoria_alimento_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_alimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategoria_alimento" ADD CONSTRAINT "subcategoria_alimento_id_nivel_riesgo_microbiologico_fkey" FOREIGN KEY ("id_nivel_riesgo_microbiologico") REFERENCES "nivel_riesgo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategoria_alimento" ADD CONSTRAINT "subcategoria_alimento_id_nivel_riesgo_quimico_fkey" FOREIGN KEY ("id_nivel_riesgo_quimico") REFERENCES "nivel_riesgo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategoria_alimento" ADD CONSTRAINT "subcategoria_alimento_id_nivel_riesgo_resultante_fkey" FOREIGN KEY ("id_nivel_riesgo_resultante") REFERENCES "nivel_riesgo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establecimiento_categoria" ADD CONSTRAINT "establecimiento_categoria_id_establecimiento_fkey" FOREIGN KEY ("id_establecimiento") REFERENCES "establecimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establecimiento_categoria" ADD CONSTRAINT "establecimiento_categoria_id_subcategoria_alimento_fkey" FOREIGN KEY ("id_subcategoria_alimento") REFERENCES "subcategoria_alimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_id_caso_fkey" FOREIGN KEY ("id_caso") REFERENCES "caso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_id_establecimiento_fkey" FOREIGN KEY ("id_establecimiento") REFERENCES "establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_id_version_ficha_fkey" FOREIGN KEY ("id_version_ficha") REFERENCES "version_ficha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_id_version_matriz_fkey" FOREIGN KEY ("id_version_matriz") REFERENCES "version_matriz_riesgo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_id_evaluador_fkey" FOREIGN KEY ("id_evaluador") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_id_coordinador_fkey" FOREIGN KEY ("id_coordinador") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_id_estado_fkey" FOREIGN KEY ("id_estado") REFERENCES "estado_evaluacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado" ADD CONSTRAINT "historial_estado_id_evaluacion_fkey" FOREIGN KEY ("id_evaluacion") REFERENCES "evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado" ADD CONSTRAINT "historial_estado_id_estado_origen_fkey" FOREIGN KEY ("id_estado_origen") REFERENCES "estado_evaluacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado" ADD CONSTRAINT "historial_estado_id_estado_destino_fkey" FOREIGN KEY ("id_estado_destino") REFERENCES "estado_evaluacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado" ADD CONSTRAINT "historial_estado_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_item" ADD CONSTRAINT "respuesta_item_id_evaluacion_fkey" FOREIGN KEY ("id_evaluacion") REFERENCES "evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_item" ADD CONSTRAINT "respuesta_item_id_item_ficha_fkey" FOREIGN KEY ("id_item_ficha") REFERENCES "item_ficha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_item" ADD CONSTRAINT "respuesta_item_id_opcion_respuesta_fkey" FOREIGN KEY ("id_opcion_respuesta") REFERENCES "opcion_respuesta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_item" ADD CONSTRAINT "respuesta_item_id_criticidad_fkey" FOREIGN KEY ("id_criticidad") REFERENCES "nivel_criticidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_riesgo" ADD CONSTRAINT "calculo_riesgo_id_evaluacion_fkey" FOREIGN KEY ("id_evaluacion") REFERENCES "evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_riesgo" ADD CONSTRAINT "calculo_riesgo_id_nivel_riesgo_fkey" FOREIGN KEY ("id_nivel_riesgo") REFERENCES "nivel_riesgo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_riesgo" ADD CONSTRAINT "calculo_riesgo_id_subcategoria_rp_fkey" FOREIGN KEY ("id_subcategoria_rp") REFERENCES "subcategoria_alimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_riesgo" ADD CONSTRAINT "calculo_riesgo_id_rango_calificacion_fkey" FOREIGN KEY ("id_rango_calificacion") REFERENCES "rango_calificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_factor_riesgo" ADD CONSTRAINT "evaluacion_factor_riesgo_id_evaluacion_fkey" FOREIGN KEY ("id_evaluacion") REFERENCES "evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_factor_riesgo" ADD CONSTRAINT "evaluacion_factor_riesgo_id_factor_fkey" FOREIGN KEY ("id_factor") REFERENCES "factor_riesgo_establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_factor_riesgo" ADD CONSTRAINT "evaluacion_factor_riesgo_id_opcion_factor_fkey" FOREIGN KEY ("id_opcion_factor") REFERENCES "opcion_factor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medida_correctiva" ADD CONSTRAINT "medida_correctiva_id_evaluacion_fkey" FOREIGN KEY ("id_evaluacion") REFERENCES "evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_id_evaluacion_fkey" FOREIGN KEY ("id_evaluacion") REFERENCES "evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_id_respuesta_item_fkey" FOREIGN KEY ("id_respuesta_item") REFERENCES "respuesta_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informe_evaluacion" ADD CONSTRAINT "informe_evaluacion_id_evaluacion_fkey" FOREIGN KEY ("id_evaluacion") REFERENCES "evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expediente" ADD CONSTRAINT "expediente_id_caso_fkey" FOREIGN KEY ("id_caso") REFERENCES "caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operacion_pendiente" ADD CONSTRAINT "operacion_pendiente_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
