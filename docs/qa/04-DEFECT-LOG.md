# 04 - Defect & Bug Reports (Bitácora de Defectos)
**Sistema PWA de Evaluación Basada en Riesgo (EBR/BPM)**  
**Cliente:** Ministerio de Salud Pública — DIGEMAPS  

---

## 1. Resumen de Defectos por Estado

| Severidad | Abiertos | Resueltos | Mitigados / Documentados | Total |
|---|---|---|---|---|
| **Crítica** | 0 | 3 | 1 (MFA) | 4 |
| **Mayor** | 0 | 3 | 0 | 3 |
| **Menor** | 0 | 1 | 0 | 1 |
| **Total** | **0** | **7** | **1** | **8** |

---

## 2. Registro Detallado de Defectos

### DEF-001 (Hallazgo D-01): Fórmula del Factor 6 en Excel devuelve FALSE
- **Severidad:** Crítica
- **Prioridad:** Alta
- **Estado:** ✅ Resuelto en Motor y Semillas
- **Componente:** `packages/risk-engine` / `apps/api/prisma/seed.ts`
- **Descripción:** En la hoja oficial de cálculo de frecuencia de DIGEMAPS, el Factor 6 devolvía `FALSE` en lugar del puntaje esperado porque el texto de la celda ("Plan de muestreo en materias primas") no coincidía con ninguna condición del `IF` anidado. Esto provocaba que el factor aportara 0 en lugar de 0.1864, alterando el $RE$ de 1.393 a 1.206.
- **Resolución:** Se corrigió la normalización en el catálogo de factores (`factores-riesgo.json`) mapeando la opción correctamente al puntaje 2.33.

---

### DEF-002 (Hallazgo D-02): Valores corruptos #N/A en Matriz de Alimentos
- **Severidad:** Mayor
- **Prioridad:** Alta
- **Estado:** ✅ Resuelto en Semillas
- **Componente:** Catálogo de Alimentos
- **Descripción:** Las filas 3 a 5 de la matriz original de alimentos contenían fórmulas rotas propagando `#N/A`.
- **Resolución:** Se depuraron las filas durante el proceso de extracción a `categorias-alimento.json`, eliminando datos basura antes de la importación a PostgreSQL.

---

### DEF-003 (Hallazgo D-03): Subcategorías de Frutas y Hortalizas sin nivel de riesgo
- **Severidad:** Mayor
- **Prioridad:** Media
- **Estado:** ✅ Resuelto con valor por defecto
- **Componente:** Catálogo de Alimentos
- **Descripción:** Tres subcategorías (purés para untar, pulpas y preparados, fermentados) carecían de asignación de riesgo en el archivo de la DIGEMAPS, impidiendo el cálculo de $RP$ si una fábrica solo producía esos ítems.
- **Resolución:** Se asignó nivel de riesgo Medio por defecto y se marcó con bandera `requiere_revision = true` en la tabla `subcategoria_alimento`.

---

### DEF-004 (Hallazgo D-04): Columna de criticidad (C/M/Me) vacía en la Ficha BPM
- **Severidad:** Crítica
- **Prioridad:** Alta
- **Estado:** ✅ Resuelto en Arquitectura
- **Componente:** Ficha BPM / `EvaluacionesService`
- **Descripción:** La columna de criticidad estaba vacía en los 45 ítems del Excel, pero la regla de aprobación exigía evaluar `NC_Criticas > 1`.
- **Resolución:** Se modeló la criticidad a nivel de la respuesta en campo (`respuesta_item.id_criticidad`). Cuando el técnico detecta un Incumplimiento Total (`IT`) o Parcial (`CP`), la aplicación le exige obligatoriamente calificar si el hallazgo es Crítico ($C$), Mayor ($M$) o Menor ($Me$).

---

### DEF-005: Columna de secreto TOTP no contemplada en esquema DBML oficial
- **Severidad:** Crítica
- **Prioridad:** Alta
- **Estado:** ✅ Resuelto
- **Componente:** `AuthService` / `UsuariosService` / `Login.tsx` / `Perfil`
- **Descripción:** El SRS menciona doble factor (MFA/2FA) para roles administrativos y operativos, pero el esquema oficial de 51 tablas compartido por la cátedra no incluía la columna para almacenar el secreto TOTP en la tabla `usuario`. Anteriormente se lanzaba una excepción no capturada que causaba un HTTP 500 al iniciar sesión si el usuario tenía `dobleFactorActivo = true`.
- **Resolución:** Se extendió el esquema Prisma y PostgreSQL con la columna `secreto_totp` (al igual que `refresh_token`), habilitando el flujo completo de autenticación de dos factores conforme a RFC 6238 (TOTP con Google Authenticator/Authy). Incluye generación segura de claves secretas en base32, emisión de códigos QR, verificación con ventana de tiempo de deriva, y recuperación de contraseña real vía SMTP/Nodemailer.

---

### DEF-006: Ausencia de rangos de calificación en semilla Prisma inicial
- **Severidad:** Mayor
- **Prioridad:** Alta
- **Estado:** ✅ Resuelto en PR #23
- **Componente:** `apps/api/prisma/seed.ts`
- **Descripción:** `rango_calificacion` no se estaba sembrando al migrar a Prisma, lo que causaba que `POST /api/v1/motor-riesgo/calcular` fallara con "Porcentaje fuera de los rangos de calificación".
- **Resolución:** Se incorporó `seedRangosCalificacion()` en `seed.ts` leyendo los 4 rangos oficiales desde `ficha-bpm.json`.

---

### DEF-007: Fallo de serialización de BigInt en Express/NestJS
- **Severidad:** Mayor
- **Prioridad:** Alta
- **Estado:** ✅ Resuelto en `main.ts`
- **Componente:** Backend API
- **Descripción:** PostgreSQL utiliza enteros de 64 bits (`BigInt`) para las claves primarias de 51 tablas. `JSON.stringify()` nativo de Node.js no soporta `BigInt` y lanzaba `TypeError: Do not know how to serialize a BigInt`.
- **Resolución:** Se implementó un parche global en `apps/api/src/main.ts`:
  ```typescript
  (BigInt.prototype as any).toJSON = function () { return this.toString(); };
  ```

---

### DEF-008: Tabla RefreshToken ausente en el DBML oficial
- **Severidad:** Crítica (Seguridad)
- **Prioridad:** Alta
- **Estado:** ✅ Resuelto en Prisma Schema
- **Componente:** Base de Datos / `schema.prisma`
- **Descripción:** El DBML oficial de 51 tablas no incluía una tabla para la persistencia y rotación de tokens de refresco, lo que impedía implementar revocación de sesiones.
- **Resolución:** Se extendió el esquema Prisma con la tabla `refresh_token` vinculada a `usuario`, con hash SHA-256, expiración y bandera de revocación.

---

### DEF-015: Contaminación cruzada de datos y configuración de perfil entre usuarios distintos
- **Severidad:** Mayor (Seguridad y Privacidad de Datos)
- **Prioridad:** Alta
- **Estado:** ✅ Resuelto en `apps/web`
- **Componente:** Frontend Web / `DialogPerfil.tsx`, `usePerfil.ts`, `AppLayout.tsx`, `Login.tsx`
- **Descripción:** Al alternar sesiones en el cliente web sin forzar una recarga total del navegador (por ejemplo, iniciando sesión como Técnico Evaluador y posteriormente como Administrador), el modal "Mi perfil" seguía desplegando la información de contacto, número telefónico y estado 2FA del usuario anterior debido a la reutilización de una clave estática en React Query (`['perfil-usuario']`), un `staleTime` prolongado y falta de purga de caché en el cierre e inicio de sesión.
- **Resolución:**
  1. Se parametrizó `usePerfil(usuarioId)` incorporando el ID del usuario en la `queryKey: ['perfil-usuario', usuarioId]`, con `staleTime: 0` y validación de coincidencia de ID.
  2. En `DialogPerfil.tsx`, se aisló el cálculo de datos válidos requiriendo que `perfil.id === usuarioSesion.id`, reseteando el estado de formulario de teléfono y contraseñas ante cambios de identidad.
  3. Se conectó `usuarioSesion` hacia `TabSeguridad`, impidiendo mostrar el estado 2FA de terceros.
  4. Se integró `queryClient.clear()` en `cerrarSesion` y en el éxito de `login`, eliminando cualquier caché residual en transiciones de sesión.
  5. Se añadió una prueba unitaria de regresión en `DialogPerfil.test.tsx` verificando el blindaje ante perfiles discrepantes.

