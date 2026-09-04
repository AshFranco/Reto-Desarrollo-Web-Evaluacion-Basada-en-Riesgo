# 07 - Estrategia de Seguridad

## 1. Objetivo

Traducir el requisito de seguridad del SRS (RNF-02: JWT + RBAC) en una estrategia técnica completa, documentando **con precisión qué está realmente implementado, qué está declarado pero no funciona, y qué es todavía diseño propuesto.** Esta distinción es el propósito central de este documento — auditorías previas de este proyecto encontraron afirmaciones de seguridad en documentación de una rama que el código no respaldaba.

> Todo lo descrito como implementado en este documento existe **solo en la rama `feat/EBR-backend-api`**, no fusionada. En `main` no hay ninguna línea de código de autenticación.

## 2. Autenticación

**Estado: 🟡 mayormente implementado, con vacíos concretos.**

| Mecanismo | Estado | Detalle |
|---|---|---|
| Hash de contraseña | ✅ | Argon2id, memoryCost 19456, timeCost 2 |
| JWT de acceso + refresh rotativo | ✅ | Access token de corta duración; refresh token de 48 bytes aleatorios, hasheado con SHA-256 antes de guardar, rotado en cada uso, con revocación en cascada |
| Refresh token en cookie | ✅ | `httpOnly`, `secure`, `sameSite=strict`, firmada, alcance limitado a `/api/v1/auth` |
| Recuperación de contraseña | ❌ | No existe ningún endpoint `forgot-password`/`reset-password` |
| MFA / 2FA | ❌ declarado pero roto | El campo `dobleFactorActivo` existe; si está activo, el login lanza un error explícito porque el esquema oficial no define columna para el secreto TOTP. **Ningún usuario con 2FA activo puede iniciar sesión hoy** |
| Bloqueo por intentos fallidos | ✅ | Servicio dedicado de bloqueo progresivo de cuenta tras N intentos, configurable |

## 3. Autorización (RBAC)

**Estado: 🟡 parcial.**

El decorador `@Roles()` junto con `RolesGuard` funciona correctamente para proteger endpoints. Sin embargo, el modelo de permisos granulares M:N (`rol_permiso`) definido en el esquema de base de datos **no se usa en la práctica**: el código de autenticación colapsa el rol de un usuario a un único "rol principal" mediante una lista de prioridad fija en código, documentada ahí mismo como limitación conocida. Esto significa que la granularidad de permisos por módulo que el esquema permite (`permiso.modulo`) no está siendo aprovechada — es una simplificación consciente, no un descuido, pero limita el control fino de acceso que el modelo de datos sí soporta.

La autorización siempre se evalúa en el backend; el frontend (cuando exista) solo debe ocultar opciones por experiencia de usuario, nunca sustituir esta validación.

## 4. Row-Level Security (RLS)

**Estado: ❌ no funcional, pese a estar parcialmente cableado — este es el hallazgo de seguridad más importante del proyecto.**

Existe un `RlsContextMiddleware` que sí fija correctamente `app.current_user_id` y `app.current_user_role` como variables de sesión de PostgreSQL en cada request. Pero el archivo donde deberían vivir las políticas (`prisma/sql/hardening.sql`) está vacío de políticas reales — contiene únicamente un comentario que dice textualmente que las políticas anteriores eran para un esquema simplificado de 25 tablas, ya obsoleto, y que están "pendientes de reescritura" para el esquema oficial de 51 tablas. No hay ni un solo `CREATE POLICY` funcional.

**Esto contradice la documentación de esa misma rama**, que en su checklist de seguridad afirma RLS como implementado. Cualquiera que lea solo ese README asumiría una capa de protección que no existe. Antes de dar por buena esa documentación, hay que corregirla.

**Impacto práctico:** hoy el único aislamiento de datos entre empresas/roles es el que aplican los guards de aplicación (`EmpresaOwnershipGuard` y similares). Si un guard de aplicación tiene un error, no hay una segunda capa a nivel de base de datos que lo contenga — que es exactamente el propósito de RLS en la arquitectura original.

## 5. Seguridad de comunicaciones

**Estado: ✅ implementado.**

- HTTPS forzado (`HttpsRedirectMiddleware`, condicionado a `FORCE_HTTPS`).
- CORS restringido a orígenes explícitos (`ALLOWED_ORIGINS`), con soporte de credenciales.
- Cabeceras de seguridad vía `helmet()`: CSP estricta, HSTS de 2 años, `frameguard: deny`, `noSniff`, `referrerPolicy: no-referrer`, cabecera `x-powered-by` deshabilitada.

## 6. Datos en reposo

**Estado: 🟡 no verificado a fondo.**

Existe un `encryption.service.ts` que implementa AES-256-GCM según la documentación de la propia rama, pero no se auditó en detalle dónde se aplica realmente sobre qué campos. Antes de tratar esto como cumplido hay que confirmar el alcance real del cifrado.

## 7. Seguridad de archivos

**Estado: ✅ implementado.**

`FileValidationPipe` valida el tipo real del archivo por contenido (magic bytes), no confía en el MIME declarado por el cliente. Límite de 15MB por archivo. Almacenamiento con nombres opacos (UUID), no rutas predecibles.

## 8. Validación de entrada

**Estado: ✅ implementado.**

`ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true` — bloquea ataques de asignación masiva (por ejemplo, que alguien intente enviar `estado: 'APROBADO'` directamente en un registro de usuario).

## 9. Rate limiting y anti fuerza bruta

**Estado: ✅ implementado, en dos capas.**

`ThrottlerGuard` global (100 solicitudes/minuto por IP) más límites específicos en rutas sensibles (login: 8/min, registro: 5/hora), sumado al servicio de bloqueo progresivo de cuenta descrito en §2.

## 10. Captcha

**Estado: 🟡 implementado, con una inconsistencia a revisar.**

El servicio de captcha verifica server-side contra hCaptcha/reCAPTCHA. Hay un comentario en el código que dice "temporal para pruebas locales: sin servicio de captcha real configurado", pero la línea que invoca la verificación está activa, no comentada. Esto significa que, si no hay una clave de captcha configurada en el entorno, el login fallaría incluso en desarrollo local — hay que confirmar si el comentario refleja una intención no terminada o si es un descuido.

## 11. CSRF

**Estado: 🟡 declarado, uso no verificado.**

La dependencia `csurf` está en el `package.json`, y el CORS permite explícitamente la cabecera `X-CSRF-Token` — hay intención de protección CSRF — pero no se encontró invocación real de `csurf()` en el arranque de la aplicación. A confirmar antes de asumir que la protección está activa.

## 12. Auditoría

**Estado: ❌ tabla existe, no se usa.**

El modelo `Auditoria` está definido en el esquema, con los campos necesarios (usuario, fecha, hora, IP, acción, entidad afectada). Pero no se encontró ninguna referencia a este modelo en el código de servicios del backend — nada escribe en esta tabla hoy. Esto es una brecha directa contra RS/RNF de trazabilidad: el sistema no puede responder hoy "quién hizo qué y cuándo" más allá de lo que los logs de aplicación capturen incidentalmente.

## 13. Manejo de errores y variables de entorno

**Estado: ✅ implementado.**

- `AllExceptionsFilter` global — no filtra stack traces ni consultas SQL al cliente.
- Validación de variables de entorno críticas al arranque (`class-validator` sobre secretos JWT, cookie secret, clave de cifrado) — si falta algo, el proceso no arranca. Esto evita el error común de desplegar con secretos por defecto o vacíos.

## 14. Gestión de secretos

Nunca deben almacenarse en el repositorio: contraseñas, cadenas de conexión reales, secretos JWT, claves de captcha, credenciales SMTP, claves de cifrado. Se gestionan vía variables de entorno, con `.env.example` como plantilla y `.env` excluido de git.

## 15. Riesgos prioritarios abiertos

| Riesgo | Impacto |
|---|---|
| RLS no funcional pese a estar documentado como implementado | Alto |
| MFA declarado pero roto — usuarios con 2FA activo no pueden entrar | Alto |
| Sin recuperación de contraseña | Medio-Alto (operativo) |
| Auditoría sin uso real | Alto (trazabilidad regulatoria — el cliente es DIGEMAPS) |
| CSRF con protección solo parcialmente confirmada | Medio |
| Cifrado en reposo sin alcance auditado | Medio |
| Captcha posiblemente bloqueante en desarrollo local | Bajo (operativo, no de seguridad) |

## 16. Conclusión

La superficie de seguridad de autenticación, validación y cabeceras está genuinamente bien construida — más completa que lo que el estado general del proyecto sugeriría. El riesgo real no está en lo que falta por construir, sino en la **brecha entre lo documentado como hecho y lo que el código realmente hace** (RLS, MFA). Antes de fusionar esta rama o de tratarla como base de producción, corregir esa documentación y cerrar RLS son las dos prioridades de seguridad más urgentes — por delante, incluso, de construir features nuevas.
