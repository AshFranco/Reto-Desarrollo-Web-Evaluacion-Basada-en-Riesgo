# ============================================================
# Verificacion completa antes de subir a GitHub.
# Correr desde la carpeta ebr-backend, con el servidor YA corriendo
# (npm run start:dev en otra ventana) y el usuario admin ya sembrado.
#
# Uso:
#   .\scripts\verificacion-final.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3000/api/v1"
$fallos = 0
$exitos = 0

function Test-Paso($nombre, $bloque) {
    Write-Host "`n--- $nombre ---" -ForegroundColor Cyan
    try {
        & $bloque
        Write-Host "OK: $nombre" -ForegroundColor Green
        $script:exitos++
    } catch {
        Write-Host "FALLO: $nombre" -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
        $script:fallos++
    }
}

# --- 1) Health check (publico) ---
Test-Paso "Health check" {
    $r = Invoke-RestMethod -Uri "$baseUrl/health"
    if ($r.status -ne "ok") { throw "status no es 'ok'" }
}

# --- 2) Ruta protegida SIN token debe dar 401 ---
Test-Paso "Ruta protegida rechaza sin token (401 esperado)" {
    try {
        Invoke-RestMethod -Uri "$baseUrl/usuarios/perfil" -Method GET
        throw "No debio responder 200, deberia dar 401"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw $_ }
    }
}

# --- 3) Login (recuerda que el captcha debe estar comentado para esta prueba local) ---
$global:token = $null
Test-Paso "Login con usuario admin" {
    $body = @{ correo = "admin@ebr.local"; password = "AdminLocal#2026!"; captchaToken = "x" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $body -ContentType "application/json"
    if (-not $r.accessToken) { throw "No se recibio accessToken" }
    $global:token = $r.accessToken
}

$headers = @{ Authorization = "Bearer $token" }

# --- 4) Perfil propio ---
Test-Paso "Obtener perfil propio" {
    $r = Invoke-RestMethod -Uri "$baseUrl/usuarios/perfil" -Method GET -Headers $headers
    if (-not $r.id) { throw "Respuesta sin id de usuario" }
}

# --- 5) Formulario vigente (ficha BPM) ---
Test-Paso "Formulario vigente tiene 45 items evaluables" {
    $r = Invoke-RestMethod -Uri "$baseUrl/formularios/vigente" -Method GET -Headers $headers
    if ($r.totalItemsEvaluables -ne 45) { throw "totalItemsEvaluables = $($r.totalItemsEvaluables), esperado 45" }
}

# --- 6) Catalogo de categorias de alimento ---
Test-Paso "Catalogo de categorias de alimento tiene datos" {
    $r = Invoke-RestMethod -Uri "$baseUrl/categorias-alimento" -Method GET -Headers $headers
    $totalSub = ($r | ForEach-Object { $_.subcategorias.Count } | Measure-Object -Sum).Sum
    if ($totalSub -ne 105) { throw "Total subcategorias = $totalSub, esperado 105" }
}

# --- 7) Crear una empresa ---
$global:empresaId = $null
Test-Paso "Crear empresa" {
    $rncUnico = "999-" + (Get-Random -Minimum 10000 -Maximum 99999) + "-9"
    $body = @{
        razonSocial = "Empresa de Prueba SRL"
        rnc = $rncUnico
        direccion = "Calle Test 1"
        actividadEconomica = "Pruebas"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/empresas" -Method POST -Body $body -ContentType "application/json" -Headers $headers
    if (-not $r.id) { throw "No se recibio id de empresa" }
    $global:empresaId = $r.id
}

# --- 8) Listar empresas ---
Test-Paso "Listar empresas" {
    $r = Invoke-RestMethod -Uri "$baseUrl/empresas" -Method GET -Headers $headers
    if ($r.Count -lt 1) { throw "Lista de empresas vacia" }
}

# --- 9) Obtener empresa por id ---
Test-Paso "Obtener empresa por id" {
    $r = Invoke-RestMethod -Uri "$baseUrl/empresas/$empresaId" -Method GET -Headers $headers
    if ("$($r.id)" -ne "$empresaId") { throw "id no coincide: obtuvo '$($r.id)', esperaba '$empresaId'" }
}

# --- 10) Registros pendientes de validacion (debe responder, aunque este vacio) ---
Test-Paso "Listar registros pendientes de usuarios" {
    Invoke-RestMethod -Uri "$baseUrl/usuarios/registros/pendientes" -Method GET -Headers $headers | Out-Null
}

# --- 11) Listar casos (debe responder, aunque este vacio o con datos) ---
Test-Paso "Listar casos" {
    Invoke-RestMethod -Uri "$baseUrl/casos" -Method GET -Headers $headers | Out-Null
}

# --- 12) Listar alertas LAPCH ---
Test-Paso "Listar alertas LAPCH" {
    Invoke-RestMethod -Uri "$baseUrl/alertas-lapch" -Method GET -Headers $headers | Out-Null
}

# --- 13) Listar denuncias ---
Test-Paso "Listar denuncias" {
    Invoke-RestMethod -Uri "$baseUrl/denuncias" -Method GET -Headers $headers | Out-Null
}

# --- 14) Listar expedientes ---
Test-Paso "Listar expedientes" {
    Invoke-RestMethod -Uri "$baseUrl/expedientes" -Method GET -Headers $headers | Out-Null
}

# --- 15) Logout ---
Test-Paso "Logout" {
    Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method POST -Headers $headers | Out-Null
}

Write-Host "`n============================================" -ForegroundColor Yellow
Write-Host " Resultado: $exitos OK / $fallos FALLOS" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow

if ($fallos -gt 0) {
    Write-Host "Revisa los mensajes en rojo arriba antes de subir a GitHub." -ForegroundColor Red
} else {
    Write-Host "Todo paso. Recuerda: reactiva la linea del captcha antes de subir." -ForegroundColor Green
}
