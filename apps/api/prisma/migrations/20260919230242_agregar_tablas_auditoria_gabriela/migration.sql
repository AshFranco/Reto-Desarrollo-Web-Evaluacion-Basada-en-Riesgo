-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "carta_autorizacion_id" BIGINT;

-- CreateTable
CREATE TABLE "actividad_economica" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,

    CONSTRAINT "actividad_economica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "literal_item" (
    "id" BIGSERIAL NOT NULL,
    "item_ficha_id" BIGINT NOT NULL,
    "letra" VARCHAR(5),
    "texto" TEXT NOT NULL,
    "orden" SMALLINT NOT NULL,

    CONSTRAINT "literal_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluacion_participante" (
    "id" BIGSERIAL NOT NULL,
    "evaluacion_id" BIGINT NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "usuario_id" BIGINT,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "documento_identidad" VARCHAR(20),
    "firma_ruta" VARCHAR(500),
    "fecha_firma" TIMESTAMP(3),

    CONSTRAINT "evaluacion_participante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento" (
    "id" BIGSERIAL NOT NULL,
    "uuid_local" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre_archivo" VARCHAR(250) NOT NULL,
    "ruta_almacenamiento" VARCHAR(500) NOT NULL,
    "tipo_mime" VARCHAR(100),
    "tamano_bytes" BIGINT,
    "hash_sha256" CHAR(64),
    "subido_por_id" BIGINT,
    "fecha_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacion_excel" (
    "id" SERIAL NOT NULL,
    "tipo_fuente" VARCHAR(40) NOT NULL,
    "nombre_archivo" VARCHAR(250) NOT NULL,
    "usuario_id" BIGINT,
    "filas_leidas" INTEGER NOT NULL DEFAULT 0,
    "filas_importadas" INTEGER NOT NULL DEFAULT 0,
    "filas_rechazadas" INTEGER NOT NULL DEFAULT 0,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'EN_PROCESO',
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3),

    CONSTRAINT "importacion_excel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacion_detalle" (
    "id" BIGSERIAL NOT NULL,
    "importacion_id" INTEGER NOT NULL,
    "fila_origen" INTEGER NOT NULL,
    "resultado" VARCHAR(15) NOT NULL,
    "motivo" VARCHAR(400),
    "datos_originales" JSONB,

    CONSTRAINT "importacion_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "actividad_economica_codigo_key" ON "actividad_economica"("codigo");

-- CreateIndex
CREATE INDEX "ix_literal_item" ON "literal_item"("item_ficha_id");

-- CreateIndex
CREATE UNIQUE INDEX "documento_uuid_local_key" ON "documento"("uuid_local");

-- CreateIndex
CREATE INDEX "ix_imp_det" ON "importacion_detalle"("importacion_id", "resultado");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_carta_autorizacion_id_fkey" FOREIGN KEY ("carta_autorizacion_id") REFERENCES "documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "literal_item" ADD CONSTRAINT "literal_item_item_ficha_id_fkey" FOREIGN KEY ("item_ficha_id") REFERENCES "item_ficha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_participante" ADD CONSTRAINT "evaluacion_participante_evaluacion_id_fkey" FOREIGN KEY ("evaluacion_id") REFERENCES "evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_participante" ADD CONSTRAINT "evaluacion_participante_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacion_excel" ADD CONSTRAINT "importacion_excel_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacion_detalle" ADD CONSTRAINT "importacion_detalle_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importacion_excel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
