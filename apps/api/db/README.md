# Fuente de verdad del esquema

El archivo `01_schema.sql` en esta carpeta es el DDL oficial del proyecto
(51 tablas), acordado previamente por el equipo. Es la fuente de verdad.

`prisma/schema.prisma` se genera a partir de este archivo con
`npx prisma db pull` (introspección), NUNCA se escribe a mano — así se
evita cualquier desajuste entre el schema de Prisma y las tablas reales.

Ver PASO A PASO en la raíz del proyecto: `MIGRACION_ESQUEMA.md`
