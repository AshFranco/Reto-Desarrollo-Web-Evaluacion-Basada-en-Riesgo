<#
.SYNOPSIS
    Automatiza la puesta en marcha del backend EBR/BPM en Windows.
.DESCRIPTION
    Requisitos previos (instalar manualmente antes de correr este script):
      - Node.js (https://nodejs.org, version LTS)
      - PostgreSQL (https://www.postgresql.org/download/windows/)
      - Una base de datos vacia llamada 'ebr_bpm' ya creada en pgAdmin
    Este script se encarga de: crear el .env, instalar dependencias,
    crear las tablas, aplicar la seguridad (RLS) y cargar los catalogos.
.EXAMPLE
    .\setup.ps1
#>

$ErrorActionPreference = "Stop"

function Write-Step($mensaje) {
    Write-Host ""
    Write-Host "==> $mensaje" -ForegroundColor Cyan
}

function Write-Ok($mensaje) {
    Write-Host "    OK: $mensaje" -ForegroundColor Green
}

function Write-Warn($mensaje) {
    Write-Host "    AVISO: $mensaje" -ForegroundColor Yellow
}

# --- 0) Verificar que estamos en la carpeta correcta ---
if (-not (Test-Path "package.json") -or -not (Test-Path "prisma\schema.prisma")) {
    Write-Host "ERROR: Este script debe correrse desde la carpeta raiz de 'ebr-backend'." -ForegroundColor Red
    Write-Host "Estas en: $(Get-Location)" -ForegroundColor Red
    exit 1
}

# --- 1) Verificar Node.js ---
Write-Step "Verificando Node.js..."
try {
    $nodeVersion = node --version
    Write-Ok "Node.js $nodeVersion detectado."
} catch {
    Write-Host "ERROR: Node.js no esta instalado o no se reconoce como comando." -ForegroundColor Red
    Write-Host "Instalalo desde https://nodejs.org (version LTS) y reinicia PowerShell." -ForegroundColor Red
    exit 1
}

# --- 2) Crear .env si no existe ---
Write-Step "Configurando archivo .env..."
if (Test-Path ".env") {
    Write-Warn ".env ya existe, no se sobrescribe. Verifica que tenga tu contraseña de PostgreSQL correcta."
} else {
    if (-not (Test-Path ".env.local.example")) {
        Write-Host "ERROR: No se encontro .env.local.example" -ForegroundColor Red
        exit 1
    }
    Copy-Item ".env.local.example" ".env"
    Write-Ok ".env creado desde la plantilla."
    Write-Warn "IMPORTANTE: abre el archivo .env ahora y reemplaza 'dev_password_cambiar'"
    Write-Warn "con tu contrasena REAL de PostgreSQL (usuario 'postgres') en DATABASE_URL"
    Write-Warn "y DIRECT_DATABASE_URL. Este script va a esperar a que confirmes."
    notepad.exe ".env"
    Read-Host "Presiona Enter aqui DESPUES de guardar el .env con tu contrasena correcta"
}

# --- 3) Instalar dependencias ---
Write-Step "Instalando dependencias (npm install)... esto puede tardar 1-2 minutos"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install fallo. Revisa el mensaje de error arriba." -ForegroundColor Red
    exit 1
}
Write-Ok "Dependencias instaladas."

# --- 4) Verificar compilacion ---
Write-Step "Verificando que el proyecto compila (tsc --noEmit)..."
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Hay errores de compilacion. Revisa el mensaje de arriba." -ForegroundColor Red
    exit 1
}
Write-Ok "Compila sin errores."

# --- 5) Crear las tablas ---
Write-Step "Creando las tablas en la base de datos (prisma migrate dev)..."
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: La migracion fallo. Verifica que:" -ForegroundColor Red
    Write-Host "  - PostgreSQL este corriendo" -ForegroundColor Red
    Write-Host "  - La base 'ebr_bpm' exista (creala en pgAdmin si falta)" -ForegroundColor Red
    Write-Host "  - La contrasena en tu .env sea correcta" -ForegroundColor Red
    exit 1
}
Write-Ok "Tablas creadas."

# --- 6) Aplicar seguridad RLS ---
Write-Step "Aplicando seguridad (Row-Level Security)..."
Write-Warn "Este paso NO se automatiza: debes aplicarlo manualmente desde pgAdmin."
Write-Warn "1. Abre pgAdmin -> tu base ebr_bpm -> Query Tool"
Write-Warn "2. Copia el contenido de prisma\sql\hardening.sql"
Write-Warn "3. BORRA o comenta la linea: REVOKE UPDATE, DELETE ON log_auditoria FROM ebr_app_user;"
Write-Warn "4. Ejecuta con F5"
Read-Host "Presiona Enter aqui DESPUES de aplicar hardening.sql en pgAdmin"

# --- 7) Cargar catalogos ---
Write-Step "Cargando catalogos (ficha BPM, factores de riesgo, categorias de alimento)..."
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: El seed fallo. Revisa el mensaje de arriba." -ForegroundColor Red
    exit 1
}
Write-Ok "Catalogos cargados."

# --- 8) Correr tests ---
Write-Step "Corriendo tests del motor de riesgo..."
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Los tests fallaron. Revisa el detalle arriba antes de continuar."
} else {
    Write-Ok "Tests pasando."
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " Configuracion completa. Para levantar el servidor corre:" -ForegroundColor Green
Write-Host "   npm run start:dev" -ForegroundColor Green
Write-Host " Luego, en OTRA ventana de PowerShell, prueba:" -ForegroundColor Green
Write-Host "   Invoke-RestMethod http://localhost:3000/api/v1/health" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
