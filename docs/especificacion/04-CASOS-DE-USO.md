# 04 - Casos de Uso

## 1. Objetivo

Describir los principales casos de uso del sistema EBR/BPM, derivados del SRS, con su estado real de implementación.

**Leyenda de estado:** ✅ implementado (backend) · 🟡 parcial · ❌ no implementado

## 2. Actores

- Administrador.
- Administrador Empresa.
- Usuario Delegado.
- Coordinador.
- Técnico Evaluador.
- Sistema (motor de riesgo, programación automática).

## 3. Casos de uso principales

### CU-01 Iniciar sesión
**Actor:** Cualquier usuario registrado. **Estado: ✅**
1. El usuario introduce usuario y contraseña.
2. El sistema valida credenciales con Argon2id.
3. Se emite un access token JWT y un refresh token rotativo en cookie segura.
4. El usuario accede según su rol.

> El 2FA opcional del RF-01 rompe este flujo hoy: si un usuario tiene `dobleFactorActivo=TRUE`, el login falla con error, porque falta la columna de secreto TOTP en el esquema oficial.

### CU-02 Recuperar contraseña
**Actor:** Cualquier usuario registrado. **Estado: ❌**
No existe endpoint `forgot-password`/`reset-password`. Pendiente de implementar.

### CU-03 Registrar usuario (Administrador Empresa / Usuario Delegado)
**Actor:** Empresa. **Estado: 🟡**
1. El usuario se registra con sus datos y adjunta carta de autorización.
2. Queda en estado Pendiente Validación.
3. Un Administrador aprueba o rechaza.

> El adjunto de carta de autorización existe como campo en el esquema (`carta_autorizacion_id`) pero no está conectado en el flujo de registro actual.

### CU-04 Gestionar empresa
**Actor:** Administrador Empresa / Administrador. **Estado: ✅**
Crear, editar, consultar historial y evaluaciones previas de una empresa.

### CU-05 Gestionar establecimiento
**Actor:** Administrador Empresa. **Estado: ❌**
El SRS y el modelo de datos contemplan establecimientos como entidad propia de la empresa (con dirección, municipio, permiso sanitario, categorías de alimento que elabora). No existe ningún controlador ni servicio para esta entidad en el backend actual — es un vacío real.

### CU-06 Crear solicitud BPM
**Actor:** Administrador Empresa / Usuario Delegado. **Estado: ✅**
1. La empresa completa datos de la solicitud (tipo de establecimiento, motivo, observaciones) y adjunta documentación.
2. Puede guardar como borrador o enviar.
3. Al enviar, queda en estado Pendiente de Asignación y origina un `Caso`.

### CU-07 Registrar alerta LAPCH
**Actor:** Coordinador / Administrador. **Estado: ✅**
1. Se registra número de alerta, fecha, producto, empresa y descripción.
2. Se resuelve como Procede o No Procede.
3. Si procede, origina un `Caso` y puede generar evaluación.

### CU-08 Registrar denuncia
**Actor:** Coordinador / Administrador. **Estado: ✅**
Mismo patrón que CU-07, con resultado Procede / No Procede / Remisión a otro proceso, y soporte para denuncia anónima.

### CU-09 Programación institucional automática
**Actor:** Sistema. **Estado: ❌**
Al finalizar el cálculo de riesgo de una evaluación, el sistema debería generar automáticamente una `ProgramacionInstitucional` con la fecha de la siguiente inspección (según la frecuencia calculada) y originar el `Caso` siguiente, cerrando el ciclo. Esta lógica existe en `db/05_funciones.sql` (PL/pgSQL) pero **no está portada al backend NestJS** — es el vacío más crítico del sistema hoy.

### CU-10 Asignar evaluador
**Actor:** Coordinador. **Estado: ✅ básico**
1. El Coordinador ve un caso pendiente de asignación.
2. Asigna un Técnico Evaluador según prioridad y tipo de caso.
3. Puede reasignar (no verificado como flujo explícito separado).

### CU-11 Consultar calendario de evaluaciones
**Actor:** Técnico Evaluador. **Estado: 🟡**
Vista de día/semana/mes con empresa, dirección, fecha y estado. Solo existe el endpoint de consulta por rango de fechas; las vistas dependen del frontend, inexistente.

### CU-12 Ejecutar evaluación en campo
**Actor:** Técnico Evaluador. **Estado: 🟡**
1. El técnico inicia la evaluación asignada.
2. Captura información general, procesos, personal, infraestructura.
3. Responde cada criterio de la ficha BPM: Cumple / No Cumple / No Aplica, con observaciones.
4. Adjunta evidencias fotográficas, documentales o de video.
5. Guarda avance o finaliza.

> Sin frontend ni cliente offline, este caso de uso hoy solo puede ejercitarse llamando directamente a la API — no hay experiencia real de "ficha dinámica" para el usuario.

### CU-13 Calcular riesgo
**Actor:** Sistema. **Estado: ✅**
Al finalizar la evaluación, el motor de riesgo calcula automáticamente porcentaje de cumplimiento, RE, RP, RT, nivel de riesgo, frecuencia de la próxima inspección y resultado de aprobación. Es el caso de uso más maduro y mejor probado del sistema (17 casos de prueba).

### CU-14 Generar informe de evaluación
**Actor:** Técnico Evaluador (genera) / Sistema. **Estado: 🟡**
Genera resumen ejecutivo, hallazgos, no conformidades y recomendaciones como texto estructurado. No genera PDF — no hay librería de generación de PDF en el proyecto.

### CU-15 Revisar informe
**Actor:** Coordinador. **Estado: 🟡**
1. El Coordinador revisa el informe enviado.
2. Aprueba, devuelve, o solicita corrección.
3. Tras el envío, los datos de la evaluación quedan bloqueados (`trg_eval_bloqueada` en SQL — no verificado si el bloqueo está replicado en la migración Prisma).

### CU-16 Corregir y reenviar evaluación
**Actor:** Técnico Evaluador. **Estado: ❌ no verificado / probablemente no implementado**
El técnico debería poder ver las observaciones del Coordinador, corregir el informe y reenviarlo. No se encontró un endpoint específico para este flujo.

### CU-17 Cerrar expediente
**Actor:** Coordinador / Administrador. **Estado: 🟡**
Genera resultado final y fecha de cierre. La descarga en PDF depende de CU-14, que no produce PDF hoy.

### CU-18 Consultar histórico
**Actor:** Todos, según permisos. **Estado: 🟡**
Búsqueda por empresa, solicitud, evaluación, fecha o estado. Endpoint existe; filtros exactos no auditados a fondo.

### CU-19 Capturar evidencias
**Actor:** Técnico Evaluador. **Estado: 🟡**
Subida de fotos, documentos y video con validación real por contenido del archivo (no por extensión ni MIME declarado), límite de 15MB. Geolocalización es un campo del modelo, sin lógica de compresión ni cola de sincronización offline real, porque no existe cliente que la use.

### CU-20 Sincronizar en modo offline
**Actor:** Técnico Evaluador / Sistema. **Estado: ❌**
La infraestructura de datos está preparada (`uuid_local` en entidades mutables, tabla `operacion_pendiente` como cola de sincronización idempotente), pero no existe ningún cliente offline (PWA) que la consuma. Sin frontend, este caso de uso no puede ejercitarse todavía.

## 4. Casos de uso pendientes de refinamiento con DIGEMAPS

- Reglas exactas de reasignación de evaluador (¿requiere justificación? ¿notifica al técnico anterior?).
- Proceso exacto de corrección y reenvío tras devolución (CU-16).
- Resolución de A-01 y A-02 antes de que el cálculo de riesgo pueda considerarse definitivo para producción (afecta directamente a CU-13).
- Confirmación de A-07: si el permiso sanitario depende de la aprobación de la inspección, no solo del porcentaje.
