# Informe técnico — Decisiones de arquitectura y seguridad
## Backend EBR/BPM

Este documento explica el **por qué** detrás de las decisiones técnicas del
proyecto, para que cualquier miembro del equipo pueda entenderlo sin tener
que descifrar el código primero.

---

## 1. ¿Por qué NestJS y no Express "puro"?

El SRS propone dos opciones de backend: ".NET 9 Web API" o "NodeJS, Express,
API REST". Elegimos la segunda ruta, pero con **NestJS** encima.

**Importante**: NestJS **no es una alternativa** a Express — es un framework
construido **sobre** Express. Por debajo, sigue siendo Node.js + Express +
API REST, tal como pide el SRS. La diferencia es que NestJS aporta una
arquitectura ya organizada (módulos, inyección de dependencias, decoradores
de validación) que sería mucho trabajo armar a mano en Express plano, sobre
todo con un sistema de 17+ dominios (usuarios, empresas, casos, evaluaciones,
motor de riesgo, etc.).

---

## 2. ¿Por qué PostgreSQL?

| Razón | Detalle |
|---|---|
| **Row-Level Security nativo** | Ver sección 3. MySQL no lo tiene; SQL Server lo simula de forma más compleja (Security Policies + funciones de predicado). |
| **Enums nativos** | La Ficha BPM tiene valores fijos (C/CP/IT/N-A, Crítica/Mayor/Menor). Postgres los valida a nivel de base de datos. |
| **Tipo `Decimal` preciso** | Los pesos de los factores de riesgo (0.16, 0.56, etc.) y puntajes (1.67, 2.33) necesitan precisión exacta, no aproximaciones de punto flotante. |
| **Gratis y sin licenciamiento** | A diferencia de SQL Server en un entorno de producción real. |
| **Recomendado en el propio SRS** | La sección de arquitectura del documento lista "PostgreSQL, MySQL" como opciones; Postgres es superior para este caso por los 3 puntos anteriores. |

---

## 3. ¿Qué es Row-Level Security (RLS) y por qué lo usamos?

### El problema que resuelve

Sin RLS, una consulta como `SELECT * FROM empresa;` devuelve **todas** las
filas de la tabla, sin importar quién la ejecute. Eso significa que el
código de la aplicación (los `services` de NestJS) tiene que acordarse
**siempre** de filtrar manualmente "solo trae lo que le pertenece a este
usuario". Si un desarrollador olvida ese filtro en un solo endpoint nuevo,
un Administrador de Empresa podría ver o editar datos de otra empresa que
no es la suya — una fuga de datos real.

### Cómo lo resolvemos

Con RLS, la restricción vive **en la base de datos misma**, no solo en el
código. Ejemplo real del proyecto (`prisma/sql/hardening.sql`):

```sql
CREATE POLICY empresa_select_interno ON empresa
  FOR SELECT
  USING (
    fn_current_user_role() IN ('ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR')
    OR id IN (SELECT id_empresa FROM usuario WHERE id = fn_current_user_id())
  );
```

Esto le dice a PostgreSQL: "filtra automáticamente las filas de esta tabla
según quién esté conectado". Da igual qué consulta mande el código de la
aplicación — la base de datos nunca devuelve más de lo permitido.

### Defensa en profundidad: dos capas

El proyecto usa **dos capas** de esta misma protección:

1. **A nivel de aplicación** (`EmpresaOwnershipGuard` en
   `src/common/guards/`) — primera línea, rápida, con buenos mensajes de error.
2. **A nivel de base de datos** (las políticas RLS) — segunda línea, que
   actúa **aunque la primera falle** por un bug o un endpoint nuevo mal hecho.

Es como tener llave en la puerta de la casa (capa 1) y además una caja
fuerte adentro para lo valioso (capa 2, RLS).

### Cómo se activa

Cada petición HTTP pasa por `RlsContextMiddleware`
(`src/common/middleware/rls-context.middleware.ts`), que le informa a
Postgres quién está conectado antes de ejecutar cualquier consulta:

```sql
SELECT set_config('app.current_user_id', 'uuid-del-usuario', true);
SELECT set_config('app.current_user_role', 'ADMINISTRADOR_EMPRESA', true);
```

Las políticas RLS usan esos valores para decidir qué filas mostrar.

---

## 4. Otras decisiones de seguridad relevantes

| Requisito | Cómo se implementa | Dónde |
|---|---|---|
| Contraseñas hasheadas | Argon2id (no MD5/SHA plano, no reversible) | `src/modules/auth/password.service.ts` |
| Sesión / tokens | JWT de acceso corto (15 min) + refresh token opaco rotativo en cookie `httpOnly` | `src/modules/auth/token.service.ts` |
| Autenticación obligatoria por defecto | `JwtAuthGuard` global — toda ruta requiere login salvo que se marque `@Public()` explícitamente (fail-closed) | `src/common/guards/jwt-auth.guard.ts` |
| Permisos por rol (RBAC) | `RolesGuard` + decorador `@Roles(...)` en cada controller | `src/common/guards/roles.guard.ts` |
| Validación de entradas | `class-validator` en cada DTO, rechaza campos no declarados (`forbidNonWhitelisted`) | `src/modules/*/dto/*.dto.ts` |
| Archivos subidos | Se valida el tipo REAL del archivo (magic bytes), no el que dice el navegador; nombres opacos en disco (UUID, no el nombre original) | `src/common/pipes/file-validation.pipe.ts`, `src/common/services/storage.service.ts` |
| Fuerza bruta en login | Bloqueo de cuenta tras N intentos fallidos + límite de peticiones por IP | `src/modules/auth/login-throttle.service.ts` |
| Datos sensibles en reposo | Cifrado AES-256-GCM | `src/common/services/encryption.service.ts` |
| Bloqueo de evaluaciones enviadas | Trigger en PostgreSQL — ni con acceso directo a la base se puede editar una evaluación ya bloqueada | `prisma/sql/hardening.sql` |

---

## 5. Fidelidad a los documentos oficiales

Antes de escribir código, se extrajo el algoritmo exacto de los 3 archivos
fuente (ver `prisma/seed-data/*.json`, generados directamente de los Excel):

- **Ficha BPM**: 45 ítems reales en 34 secciones, con el sistema de puntaje
  exacto (Cumple=1, Cumplimiento Parcial=0.5, Incumplimiento Total=0,
  No Aplica=excluido del cálculo).
- **Categorización de Establecimiento**: los 6 factores de riesgo con sus
  pesos reales (16%, 9%, 56%, 5%, 6%, 8% — suman 100%) y las 4 opciones de
  cada uno, extraídas de los menús desplegables del Excel original.
- **Matriz de Riesgo de Alimentos**: 105 categorías CODEX con su nivel de
  riesgo microbiológico/químico real.

Esto se verifica automáticamente con `npm test`
(`test/motor-riesgo.spec.ts`), que confirma que el cálculo de riesgo da
exactamente los mismos resultados que la hoja de cálculo original en los
casos límite.

---

## 6. Cómo poner esto a correr

Ver `SETUP_WINDOWS.md` para la guía paso a paso, o correr `.\setup.ps1`
para automatizar la mayoría de los pasos (requiere tener Node.js y
PostgreSQL ya instalados, y una base de datos vacía `ebr_bpm` creada).
