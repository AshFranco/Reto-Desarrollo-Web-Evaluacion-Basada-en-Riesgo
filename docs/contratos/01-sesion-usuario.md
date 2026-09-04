# Contrato 01 — Sesión de usuario autenticado

**Lo entrega:** Integrante 1 (Gabriela — backend `apps/api`)  
**Lo consumen:** Integrantes 2, 3, 4  
**Se cierra el:** martes 25 de agosto  
**Estado:** Cerrado — completado a partir del código en `feat/EBR-backend-api` · Integrante 3 · 2026-09-03

---

## Qué resuelve este contrato

Cualquier pantalla protegida, cualquier endpoint que requiera saber quién hace la
petición, y cualquier dato guardado localmente sin conexión necesita saber la misma
información sobre el usuario que inició sesión. Este contrato fija esa forma una
sola vez para que nadie la invente por su cuenta.

## 1. Qué se recibe al iniciar sesión correctamente

### Petición

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "correo": "ana.perez@digemaps.gob.do",
  "password": "secreto123",
  "captchaToken": "<token de hCaptcha>"
}
```

> **Nota:** `captchaToken` es obligatorio. El backend lo verifica con hCaptcha.
> El login **requiere conexión a internet** — no hay login offline.

### Respuesta

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "12",
    "nombreCompleto": "Ana Pérez",
    "rol": "TECNICO_EVALUADOR",
    "empresaId": null
  }
}
```

> `id` es **string** (BigInt serializado). `rol` es **singular** (no `roles[]`).
> El `refreshToken` **NO viene en el JSON** — el servidor lo envía en una cookie
> `httpOnly`/`secure`/`sameSite=strict` de nombre `refresh_token`, alcance
> `/api/v1/auth`. El navegador la gestiona automáticamente.

## 2. Qué contiene el token de acceso

```json
{
  "sub": "12",
  "rol": "TECNICO_EVALUADOR",
  "empresaId": null,
  "iat": 1725368400,
  "exp": 1725369300
}
```

- `sub`: id del usuario como **string** (no número).
- `rol`: código de rol único. Un usuario tiene un solo rol activo por sesión.
- `empresaId`: id de empresa como string, o `null` para usuarios internos de DIGEMAPS.
- Access token dura **15 minutos** (`JWT_ACCESS_EXPIRES_IN=15m`).
- Refresh token dura **7 días** en cookie firmada.

## 3. Cómo se renueva la sesión

El navegador envía automáticamente la cookie `refresh_token` al llamar a:

```
POST /api/v1/auth/refresh
```

No se envía nada en el body. El servidor rota el token y devuelve:

```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Límite:** 20 peticiones por minuto por IP.

## 4. Qué pasa cuando el token expira o es inválido

| Situación | HTTP | Cuerpo |
|---|---|---|
| Access token expirado o inválido en ruta protegida | `401` | `{ "message": "Unauthorized" }` |
| Cookie de refresh ausente al llamar refresh | `403` | `{ "message": "No hay sesión activa." }` |
| Cookie de refresh inválida o revocada | `401` | `{ "message": "Sesión inválida. Inicie sesión nuevamente." }` |

## 5. Lista de roles válidos del sistema

- `ADMINISTRADOR`
- `ADMIN_EMPRESA`
- `USUARIO_DELEGADO`
- `COORDINADOR`
- `TECNICO_EVALUADOR`

## 6. Comportamiento offline — decisiones del Integrante 3

El `refreshToken` viaja solo en cookie `httpOnly` — JavaScript no puede leerlo ni
guardarlo. Esto simplifica el diseño offline:

- El `accessToken` y los datos del `usuario` se guardan en **IndexedDB** (tabla `sesion`, registro único `id = 1`).
- El cliente calcula `expiresAt = Date.now() + 900_000` (15 min) al recibir el token.
- Si el técnico está **sin conexión** y el access token expiró: puede seguir capturando. Los datos quedan en IndexedDB.
- Al recuperar red: el `SyncProcessor` llama `POST /api/v1/auth/refresh`. El navegador envía la cookie automáticamente. Si responde `200`, actualiza el access token en IndexedDB y procede a sincronizar.
- Si la cookie expiró (7 días offline): se muestra banner _"Sesión expirada — inicia sesión para sincronizar"_. **Los datos capturados no se pierden.**

## 7. Cierre de sesión

```
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
```

Revoca todos los refresh tokens del usuario en la base de datos y limpia la cookie.

---

**Firma de acuerdo:**

- Integrante 1: _(pendiente — confirmar que el shape de `usuario` es el definitivo)_
- Integrante 2: ____
- Integrante 3: Int-3 · 2026-09-03 _(completado desde código `feat/EBR-backend-api`)_
- Integrante 4: ____
