-- CreateTable
CREATE TABLE "adjunto_solicitud_bpm" (
    "id" BIGSERIAL NOT NULL,
    "id_solicitud" BIGINT NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "nombre_archivo" VARCHAR(250) NOT NULL,
    "ruta_almacenamiento" VARCHAR(500) NOT NULL,
    "tipo_mime" VARCHAR(100),
    "tamano_bytes" BIGINT,
    "fecha_carga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjunto_solicitud_bpm_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "adjunto_solicitud_bpm" ADD CONSTRAINT "adjunto_solicitud_bpm_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitud_bpm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
