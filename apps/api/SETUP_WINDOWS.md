# Guía de instalación — Backend EBR/BPM (Windows)

Esta guía asume que **no tienes nada instalado todavía**. Sigue los pasos
en orden, sin saltarte ninguno. Al final vas a tener el backend corriendo
en tu propia computadora, con base de datos real y datos de prueba cargados.

Tiempo estimado: 30-45 minutos la primera vez.

---

## ¿Cuál ruta seguir: PostgreSQL instalado directo, o Docker?

Este proyecto soporta las dos formas de tener PostgreSQL corriendo. Elige
**una sola** según lo que ya tengas en tu computadora — no hace falta hacer
ambas.

| | PostgreSQL instalado directo | Docker |
|---|---|---|
| ¿Qué necesitas tener ya instalado? | Nada extra | Docker Desktop |
| ¿Instala pgAdmin? | Sí, automático | No (opcional, puedes seguir usando terminal) |
| ¿Cuántos pasos? | Más (instalar, crear usuario/contraseña, crear base en pgAdmin) | Menos (un solo comando levanta todo) |
| ¿Cuándo conviene? | Si no tienes Docker y no quieres instalarlo | Si ya usas Docker para otras cosas |

**Si tienes Docker Desktop instalado → salta directo a la sección
"Ruta alternativa: Docker" al final de este documento**, y luego continúa
desde el Paso 4 de abajo (Configurar `.env`).

**Si no tienes Docker → sigue los pasos en orden desde el Paso 0.**

---

## Paso 0 — Requisitos antes de empezar

Necesitas instalar 2 programas. Si ya los tienes, puedes saltar directo al Paso 1.

### 0.1 Node.js

1. Ve a **https://nodejs.org** y descarga la versión **LTS** (la recomendada, no la "Current")
2. Instala con las opciones por defecto (Next, Next, Next, Install)
3. Verifica que quedó instalado: abre **PowerShell** y escribe:
   ```powershell
   node --version
   ```
   Debe mostrarte algo como `v20.x.x` o superior. Si dice "no se reconoce como comando", reinicia la PC y vuelve a intentar.

### 0.2 PostgreSQL

1. Ve a **https://www.postgresql.org/download/windows/**
2. Clic en "Download the installer" → descarga la versión más reciente (16.x o 18.x, cualquiera sirve)
3. Ejecuta el instalador:
   - Deja todos los componentes marcados (incluye **pgAdmin 4**, lo vas a necesitar)
   - Puerto: deja el default `5432`
   - **Contraseña del superusuario `postgres`**: elige una y **apúntala en algún lado** — la vas a necesitar todo el tiempo. Ejemplo: `Postgres2026!`
   - Deja todo lo demás por defecto
4. Al final, si se abre una ventana llamada "Stack Builder", dale clic en **Cancel** — no la necesitas.

---

## Paso 1 — Clonar el proyecto

Abre PowerShell donde quieras guardar el proyecto (ej. tu carpeta de Documentos o Descargas) y corre:

```powershell
git clone <URL-DEL-REPOSITORIO-AQUI>
cd ebr-backend
```

> Si no tienes `git` instalado, descarga el proyecto como ZIP desde GitHub (botón verde "Code" → "Download ZIP") y descomprímelo. Luego navega con `cd` hasta esa carpeta.

**Importante**: si la ruta de tu carpeta tiene espacios (ej. "Mis Documentos"), usa comillas al hacer `cd`:
```powershell
cd "C:\Users\TuNombre\Documents\ebr-backend"
```

---

## Paso 2 — Instalar dependencias

Dentro de la carpeta `ebr-backend`:

```powershell
npm install
```

Tarda 1-2 minutos. Al final debe decir `added XXX packages` — si dice algo distinto o da errores en rojo, revisa que estés parado en la carpeta correcta (`pwd` te dice dónde estás).

---

## Paso 3 — Crear la base de datos en pgAdmin
*(Solo si instalaste PostgreSQL directo. Si usas Docker, sáltate este paso.)*

1. Abre **pgAdmin 4** desde el menú de inicio
2. La primera vez te pide una **contraseña maestra de pgAdmin** — es distinta a la de PostgreSQL, ponle cualquiera que recuerdes
3. En el panel izquierdo, bajo "Servers", debería aparecer tu servidor PostgreSQL. Si no aparece:
   - Clic derecho en "Servers" → **Register → Server...**
   - Pestaña **General**: Name = `Local` (o lo que quieras)
   - Pestaña **Connection**: Host = `localhost`, Port = `5432`, Username = `postgres`, Password = la que pusiste en la instalación
   - Guarda
4. Clic derecho sobre **"Databases"** → **Create → Database...**
5. Nombre: `ebr_bpm` → Save

---

## Paso 4 — Configurar el archivo `.env`

```powershell
Copy-Item .env.local.example .env
```

**Si usas Docker**: no necesitas editar nada — las credenciales de
`.env.local.example` ya coinciden exactamente con las de `docker-compose.yml`.
Solo agrega al final del archivo (`notepad .env`) estas dos líneas si no
están ya:
```
SEED_ADMIN_EMAIL="admin@ebr.local"
SEED_ADMIN_PASSWORD="AdminLocal#2026!"
```
Y salta directo al **Paso 5**.

**Si instalaste PostgreSQL directo**: sí necesitas editar la contraseña.

```powershell
notepad .env
```

Busca estas dos líneas y reemplaza `TU_CONTRASENA_AQUI` con tu contraseña real de PostgreSQL:

```
DATABASE_URL="postgresql://postgres:TU_CONTRASENA_AQUI@localhost:5432/ebr_bpm?schema=public"
DIRECT_DATABASE_URL="postgresql://postgres:TU_CONTRASENA_AQUI@localhost:5432/ebr_bpm"
```

Al final del archivo, agrega (o confirma que ya están) estas dos líneas:
```
SEED_ADMIN_EMAIL="admin@ebr.local"
SEED_ADMIN_PASSWORD="AdminLocal#2026!"
```

Guarda con **Ctrl+S** y cierra el Bloc de notas.

---

## Paso 5 — Crear las tablas

```powershell
npx prisma migrate dev --name init
```

Debe terminar con: **"Your database is now in sync with your schema."**

---

## Paso 6 — Aplicar la seguridad (Row-Level Security)

1. En pgAdmin, clic derecho sobre `ebr_bpm` → **Query Tool**
2. Abre el archivo `prisma\sql\hardening.sql` de tu proyecto con el Bloc de notas, copia **todo** el contenido
3. Pégalo en el Query Tool
4. Busca la línea que dice:
   ```sql
   REVOKE UPDATE, DELETE ON log_auditoria FROM postgres;
   ```
   y **bórrala o coméntala** (agrégale `--` al inicio) — ese rol no existe en tu instalación local, esa línea da error si la dejas.
5. Presiona **F5** para ejecutar todo

Deberías ver mensajes tipo `CREATE POLICY` sin errores rojos al final (los `NOTICE` en amarillo son normales).

---

## Paso 7 — Cargar los catálogos (ficha BPM, factores de riesgo, categorías de alimento)

```powershell
npx prisma db seed
```

Debe mostrar algo como:
```
✔ Opciones de respuesta: 4
✔ Rangos de riesgo (Matriz de Frecuencia de Inspección): 3
✔ Factores de riesgo del establecimiento: 6 (peso total: 1)
✔ Catálogo de categorías de alimento (Matriz de Riesgo): 105
✔ Ficha de Inspección BPM "2024-10-Rev-FSP-FD": 34 secciones, 45 ítems
✔ Usuario administrador inicial asegurado: admin@ebr.local
```

---

## Paso 8 — Verificar que compila y pasan los tests

```powershell
npx tsc --noEmit
npm test
```

El primero no debe mostrar ningún error. El segundo debe decir `4 passed, 4 total`.

---

## Paso 9 — Levantar el servidor

```powershell
npm run start:dev
```

Debe terminar con:
```
[Nest] LOG [NestApplication] Nest application successfully started
```

**Deja esa ventana abierta** (el servidor sigue corriendo ahí). Abre una **segunda** ventana de PowerShell, navega otra vez a la carpeta del proyecto, y prueba:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health"
```

Debe responder `status: ok`.

---

## Ruta alternativa: Docker

Si tienes **Docker Desktop** instalado, esta ruta reemplaza los Pasos 0.2
(instalar PostgreSQL) y 3 (crear base en pgAdmin) — es más corta.

### D.1 — Verificar Docker

```powershell
docker --version
```

Si no reconoce el comando, instala Docker Desktop desde
**https://www.docker.com/products/docker-desktop/** (gratis), reinicia la
PC, y vuelve a intentar.

### D.2 — Levantar PostgreSQL

Desde la carpeta del proyecto (después de haber hecho `git clone` / Paso 1):

```powershell
docker compose up -d
docker compose ps
```

La segunda línea debe mostrar el contenedor `ebr_bpm_postgres` con estado
**"healthy"**. Si dice "starting", espera unos segundos y vuelve a correr
`docker compose ps`.

Con esto ya tienes PostgreSQL corriendo, sin instalar nada más. Continúa
en el **Paso 1** de esta guía (clonar, si no lo hiciste aún) y luego el
**Paso 2** (`npm install`), saltándote los Pasos 0.2 y 3 — ve directo al
**Paso 4**, sección "Si usas Docker".

### D.3 — Aplicar `hardening.sql` sin pgAdmin

Si no tienes pgAdmin instalado, aplica la seguridad directo desde la
terminal (Docker sí tiene el rol `postgres`, así que en este caso
**no** hace falta borrar la línea del `REVOKE`, déjala tal cual):

```powershell
Get-Content prisma\sql\hardening.sql | docker exec -i ebr_bpm_postgres psql -U postgres -d ebr_bpm
```

Si prefieres usar pgAdmin igual (por ejemplo para ver las tablas
visualmente), puedes conectarte a `localhost:5432` con usuario
`postgres` y contraseña `dev_password_cambiar` — es la misma base,
solo que corriendo dentro del contenedor en vez de instalada directo.

### D.4 — El resto de los pasos

Continúa desde el **Paso 5** (crear las tablas) en adelante, exactamente
igual que la ruta sin Docker.

### D.5 — Apagar el contenedor cuando termines

```powershell
docker compose down
```

Los datos quedan guardados (en un volumen de Docker) para la próxima vez
que hagas `docker compose up -d`. Si algún día quieres borrar todo y
empezar de cero: `docker compose down -v` (el `-v` sí borra los datos).

---

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `npm install` falla con "EPERM" o "operation not permitted" | No estás en la carpeta correcta (ej. quedaste en `System32`) | Verifica con `pwd`, usa `cd "ruta completa entre comillas"` |
| `password authentication failed` al migrar | Contraseña equivocada en `.env` | Revisa `DATABASE_URL` en tu `.env` |
| `relation does not exist` al correr el seed | Se te olvidó el Paso 5 (migrate) | Corre `npx prisma migrate dev --name init` primero |
| El seed dice "se omite la creación del administrador" | Faltan `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` en `.env` | Agrégalas y vuelve a correr el seed |
| Error de `compression`/`multer`/`jest` al compilar | `npm install` no se corrió después de un cambio en `package.json` | Corre `npm install` de nuevo |
| El login da "Verificación anti-bot fallida" | Es esperado — no hay captcha real configurado en local | Ver sección siguiente |
| `docker compose ps` se queda en "starting" mucho tiempo | Primera vez que descarga la imagen de PostgreSQL | Espera 1-2 minutos, es normal solo la primera vez |
| No conecta a Docker con pgAdmin | Usaste una contraseña distinta a la del contenedor | Usa la contraseña de `docker-compose.yml` (`dev_password_cambiar`), usuario `postgres` |

---

## Probar el login en local (sin captcha real)

El captcha requiere un servicio externo real (hCaptcha/reCAPTCHA) que no está configurado en desarrollo local. Para probar el login localmente, comenta temporalmente esta línea en `src\modules\auth\auth.service.ts`:

```typescript
// await this.captchaService.verify(dto.captchaToken, meta.ip);
```

**Recuérdalo**: vuelve a descomentarla antes de hacer commit/push — nunca debe quedar desactivada en el repositorio compartido.
