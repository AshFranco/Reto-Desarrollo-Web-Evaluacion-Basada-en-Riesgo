#!/usr/bin/env bash
# ============================================================
# Smoke test manual: corre esto DESPUÉS de `npm run start:dev`.
# Verifica que la app arranca, responde y el flujo de auth básico funciona.
# No sustituye pruebas automatizadas (test/*.e2e-spec.ts), es un check rápido.
# ============================================================
set -e
BASE="http://localhost:3000/api/v1"

echo "1) Health check (debe responder 200 y {status:ok})"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" "$BASE/health"

echo "2) Ruta protegida SIN token (debe responder 401, confirma fail-closed)"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" "$BASE/usuarios/perfil"

echo "3) Login con credenciales inválidas (debe responder 401, NO 500)"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"correo":"noexiste@test.com","password":"loquesea","captchaToken":"10000000-aaaa-bbbb-cccc-000000000001"}'

echo "4) Registro con campo extra no permitido (debe responder 400 por forbidNonWhitelisted)"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" -X POST "$BASE/auth/registro" \
  -H "Content-Type: application/json" \
  -d '{"nombreCompleto":"Test","cedulaPasaporte":"001-1234567-8","correo":"test@test.com","password":"Abcdefg1234!","rol":"USUARIO_DELEGADO","empresaId":"00000000-0000-0000-0000-000000000000","esAdministrador":true}'

echo ""
echo "Si viste 200/401/401/400 en ese orden, el esqueleto de seguridad funciona."
echo "Para probar el flujo completo (login real, motor de riesgo, ficha BPM),"
echo "usa el usuario sembrado por 'npx prisma db seed' (SEED_ADMIN_EMAIL)."
