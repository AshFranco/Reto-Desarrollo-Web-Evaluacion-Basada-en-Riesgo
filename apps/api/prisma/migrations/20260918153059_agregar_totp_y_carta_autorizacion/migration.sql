-- AlterTable
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "carta_autorizacion_url" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "secreto_totp" VARCHAR(255);
