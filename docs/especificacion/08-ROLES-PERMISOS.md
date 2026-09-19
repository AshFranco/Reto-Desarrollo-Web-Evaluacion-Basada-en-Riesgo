# 08 - Roles y Permisos

## 1. Objetivo

Definir la matriz RBAC del sistema EBR/BPM a partir de los roles del SRS y del uso real verificado en el código (decoradores `@Roles()` de los controladores NestJS).

> El esquema de base de datos soporta un modelo de permisos granular M:N (`rol_permiso`, por módulo), pero el backend actual no lo aprovecha — colapsa cada usuario a un solo "rol principal" por prioridad fija en código. Esta matriz documenta el comportamiento **real** de hoy, no el potencial del modelo de datos. Ver `07-SEGURIDAD.md` §3.

## 2. Roles (SRS)

| Rol | Descripción |
|---|---|
| Administrador | Configura catálogos, parámetros y usuarios |
| Administrador Empresa | Gestiona solicitudes de la empresa |
| Usuario Delegado | Actúa en representación de la empresa |
| Coordinador | Asigna evaluaciones y revisa informes |
| Técnico Evaluador | Realiza evaluaciones e inspecciones |

## 3. Matriz de permisos por función

**Leyenda:** ✅ implementado y verificado en código · 🔵 propuesto, no implementado aún · ❌ sin acceso

| Función | Administrador | Admin. Empresa | Usuario Delegado | Coordinador | Técnico Evaluador |
|---|:---:|:---:|:---:|:---:|:---:|
| Configurar catálogos/parámetros | 🔵 | ❌ | ❌ | ❌ | ❌ |
| Aprobar/rechazar registro de usuario | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar empresa (crear/editar) | ✅ | ✅ (la propia) | ❌ | ✅ | ❌ |
| Gestionar establecimiento (crear/editar) | ✅ | ✅ (el propio) | ❌ | ✅ | ❌ |
| Crear solicitud BPM | ❌ | ✅ | ✅ | ❌ | ❌ |
| Enviar solicitud BPM | ❌ | ✅ | ✅ | ❌ | ❌ |
| Adjuntar documentación a solicitud BPM (croquis, memoria descriptiva) | ❌ | ✅ | ✅ | ❌ | ❌ |
| Registrar alerta LAPCH | ✅ | ❌ | ❌ | ✅ | ❌ |
| Registrar denuncia | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ver casos | ✅ (todos) | 🟡 (propios, vía `casos`) | 🟡 (propios) | ✅ (todos) | 🟡 (asignados) |
| Asignar evaluador | ✅ | ❌ | ❌ | ✅ | ❌ |
| Consultar calendario propio | ❌ | ❌ | ❌ | ❌ | ✅ |
| Iniciar/ejecutar evaluación | ❌ | ❌ | ❌ | ❌ | ✅ |
| Responder ficha BPM | ❌ | ❌ | ❌ | ❌ | ✅ |
| Subir evidencias | ❌ | ❌ | ❌ | ❌ | ✅ |
| Calcular riesgo | ✅ | ❌ | ❌ | ✅ | ✅ |
| Generar informe | ❌ | ❌ | ❌ | ❌ | ✅ |
| Revisar informe (aprobar/devolver) | ✅ | ❌ | ❌ | ✅ | ❌ |
| Corregir y reenviar informe | ❌ | ❌ | ❌ | ❌ | 🔵 |
| Cerrar expediente | ✅ | ❌ | ❌ | ✅ | ❌ |
| Consultar histórico | ✅ (todo) | 🟡 (propio) | 🟡 (propio) | ✅ (todo) | 🟡 (propio) |
| Consultar categorías de alimento | ✅ | ✅ | ✅ | ✅ | ✅ |

## 4. Principio de mínimo privilegio

Cada rol solo debería tener los permisos estrictamente necesarios para su función. Hoy esto se aplica a nivel de guard de ruta (`@Roles()`), pero no a nivel de campo o de fila más allá de lo que implementa `EmpresaOwnershipGuard` — y sin RLS activo (ver `07-SEGURIDAD.md` §4), el aislamiento fino entre empresas depende enteramente de que cada guard de aplicación esté correctamente aplicado en cada endpoint, sin excepción.

## 5. Separación de funciones

Se recomienda mantener separadas estas capacidades entre roles distintos, tal como el diseño actual ya lo hace:

- Quien asigna al evaluador (Coordinador) no es quien ejecuta la evaluación (Técnico).
- Quien captura los hallazgos (Técnico) no es quien los aprueba (Coordinador).
- Quien configura catálogos (Administrador) no participa directamente en la ejecución de evaluaciones.

## 6. Alcance de datos por rol

Más allá del permiso de operación, el sistema restringe el alcance visible:

- **Administrador Empresa / Usuario Delegado:** solo ven datos de su propia empresa (`EmpresaOwnershipGuard`).
- **Técnico Evaluador:** solo ve las evaluaciones que le fueron asignadas.
- **Coordinador / Administrador:** ven todo el conjunto, sin restricción de empresa.

Esta restricción de alcance depende hoy exclusivamente de la capa de aplicación — ver la advertencia de RLS en `07-SEGURIDAD.md`.

## 7. Pendientes de definición con DIGEMAPS

- Si el modelo de permisos granulares M:N (`rol_permiso`) debe activarse eventualmente, o si el modelo simplificado de "un rol principal" es aceptable para producción.
- Permisos exactos de reasignación de evaluador (¿el Administrador puede reasignar directamente, o solo el Coordinador?).
- Alcance de auditoría por rol (quién puede consultar el módulo de auditoría, hoy sin implementar).

### Resuelto: Usuario Delegado vs Administrador Empresa

Decisión de producto (2026-09-18): el Usuario Delegado **actúa en representación de la empresa para trámites** (crear/enviar/adjuntar solicitudes BPM), pero **no administra los datos de la empresa**. Solo el Administrador Empresa puede crear/editar la empresa y sus establecimientos. Implementado quitando `USUARIO_DELEGADO` de los guards `@Roles()` de `POST /empresas`, `POST /establecimientos` y `PATCH /establecimientos/:id` (el `PATCH /empresas/:id` ya lo restringía correctamente).
