# Contrato 01 — Sesión de usuario autenticado

**Lo entrega:** Integrante 1
**Lo consumen:** Integrantes 2, 3, 4
**Se cierra el:** martes 25 de agosto
**Estado:** Borrador — llenar en la reunión conjunta de hoy

---

## Qué resuelve este contrato

Cualquier pantalla protegida, cualquier endpoint que requiera saber quién hace la
petición, y cualquier dato guardado localmente sin conexión necesita saber la misma
información sobre el usuario que inició sesión. Este contrato fija esa forma una
sola vez para que nadie la invente por su cuenta.

## 1. Qué se recibe al iniciar sesión correctamente

```json
{
  "accessToken": "",
  "refreshToken": "",
  "expiresIn": 0,
  "usuario": {
    "id": 0,
    "nombreCompleto": "",
    "correo": "",
    "roles": [""]
  }
}
```

> Completar con los nombres de campo reales acordados. Si algún nombre cambia
> respecto a este borrador (por ejemplo `accessToken` vs `access_token`), se
> corrige aquí y se avisa a los tres roles que lo consumen.

## 2. Qué contiene el token de acceso (para que el backend valide permisos)

- ¿Qué identifica al usuario dentro del token?
- ¿Los roles van dentro del token o se consultan aparte?
- ¿Cuánto dura el token de acceso? ¿Cuánto el de renovación?

## 3. Cómo se renueva la sesión

Petición:
```
POST /
Body: { "refreshToken": "" }
```

Respuesta: misma forma que el punto 1.

## 4. Qué pasa cuando el token expira o es inválido

- Código de estado HTTP que debe esperar el frontend: ____
- Forma del cuerpo de error: ____

## 5. Lista de roles válidos del sistema

Confirmar los códigos exactos que va a usar el sistema (deben coincidir con la
tabla `rol` de la base de datos):

- `ADMINISTRADOR`
- `ADMIN_EMPRESA`
- `USUARIO_DELEGADO`
- `COORDINADOR`
- `TECNICO_EVALUADOR`

## 6. Qué necesita el Integrante 3 para el inicio de sesión sin conexión

- ¿Se guarda el token en el almacenamiento local del dispositivo? ¿Con qué nombre de clave?
- ¿Qué pasa si el usuario abre la aplicación sin conexión y el token ya expiró?

---

**Firma de acuerdo** (nombre y fecha de quien confirma que este contrato es el definitivo):

- Integrante 1: ____
- Integrante 2: ____
- Integrante 3: ____
- Integrante 4: ____
