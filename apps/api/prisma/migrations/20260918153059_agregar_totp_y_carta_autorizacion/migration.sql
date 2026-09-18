-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "carta_autorizacion_url" VARCHAR(500),
ADD COLUMN     "secreto_totp" VARCHAR(255);
