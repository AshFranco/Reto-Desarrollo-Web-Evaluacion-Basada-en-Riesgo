# 03 - Requisitos del Sistema

## 1. Objetivo

Organizar los requisitos del SRS para facilitar trazabilidad, diseño, implementación y pruebas, cruzados contra el **estado real verificado del código** en `main` (backend fusionado vía PR #1, 2026-09-04).

**Leyenda de estado:** ✅ completo · 🟡 parcial · ❌ no iniciado

## 2. Requisitos funcionales

| ID | Requisito | Actor principal | Estado real | Nota |
|---|---|---|---|---|
| RF-01 | Autenticación: login, recuperación de contraseña, cambio de contraseña, logout, 2FA opcional | Todos | ✅ Completo | Login/logout/refresh/recuperación implementados en `apps/api`. 2FA (TOTP) funcional desde 2026-09-18 (`secretoTotp` en schema.prisma, flujo en `auth.service.ts`). |
| RF-02 | Registro de Administrador Empresa y Usuario Delegado, con carta de autorización, estados Pendiente/Aprobado/Rechazado | Administrador | 🟡 Parcial | Flujo de estados implementado (`registro` + `resolver`); el campo `carta_autorizacion_id` del esquema no está conectado en el módulo de usuarios de la rama |
| RF-03 | Gestión de empresas y establecimientos: registrar, editar, consultar historial y evaluaciones previas | Administrador Empresa | 🟡 Parcial | CRUD de empresa completo. Módulo `establecimientos` implementado en `apps/api/src/modules/establecimientos/` (2026-09-18). Frontend: `FormularioEstablecimiento.tsx` con Stepper de 2 pasos — pendiente completar a 4 pasos según SANiLAB. |
| RF-04 | Dashboards por rol (Empresa, Coordinador, Técnico, Admin) | Todos | ✅ Completo | `DashboardAdmin.tsx`, `DashboardCoordinador.tsx`, `DashboardEmpresa.tsx`, `DashboardTecnico.tsx` implementados en `apps/web/src/`. Módulo de notificaciones backend completo (PR #46, #49). |
| RF-05 | Solicitudes BPM: crear, guardar borrador, enviar | Administrador Empresa / Usuario Delegado | ✅ Completo (a nivel de API) | Crear borrador + enviar + listar propias, con guard de pertenencia a empresa |
| RF-06 | Gestión unificada de casos por 4 escenarios de origen | Coordinador | ✅ Completo | 3 de 4 orígenes crean `Caso` (solicitud, alerta LAPCH, denuncia). El 4º origen — programación institucional automática — está implementado y funcional |
| RF-07 | Programación de evaluaciones: programar, reprogramar, cancelar; y programación automática desde la frecuencia calculada | Coordinador / Sistema | ✅ Completo | El servicio NestJS cierra el ciclo e inserta la programación correctamente. |
| RF-08 | Gestión de alertas LAPCH: registrar, resultado procede/no procede | Coordinador | ✅ Completo | Registrar + resolver + listar |
| RF-09 | Gestión de denuncias: registrar, resultado procede/no procede/remisión | Coordinador | ✅ Completo | Mismo patrón que alertas LAPCH |
| RF-10 | Asignación y reasignación de evaluador | Coordinador | ✅ Básico | Asignar + listar propias. Reasignación explícita y vista de carga por técnico no verificadas |
| RF-11 | Calendario del evaluador: vista día/semana/mes | Técnico Evaluador | ✅ Completo | Endpoints backend completados y vistas implementadas en el frontend |
| RF-12 | Ejecución de evaluación: iniciar, guardar avance, finalizar | Técnico Evaluador | ✅ Completo | Endpoints existen (`iniciar`, `respuestas`, `finalizar`); detalle de servicio no auditado a fondo |
| RF-13 | Formulario de evaluación BPM: ficha jerárquica, Cumple/No Cumple/No Aplica, observaciones, evidencias | Técnico Evaluador | ✅ Completo | Ficha dinámica implementada en el frontend. |
| RF-14 | Motor de riesgo: puntaje, % cumplimiento, nivel de riesgo | Sistema | ✅ **Completo y bien probado** | La pieza más madura del proyecto — ver §3 abajo para las fórmulas exactas. 17 casos de prueba, cero números hardcodeados, verificación cruzada en PL/pgSQL |
| RF-15 | Captura de evidencias: fotos, documentos, video, geolocalización opcional, modo offline | Técnico Evaluador | ✅ Completo | Subida con validación real por magic bytes (no MIME declarado) y límite de 15MB. Geolocalización es solo campo en el modelo; sin cliente offline no hay cola de sincronización real que la use |
| RF-16 | Informe de evaluación: resumen ejecutivo, hallazgos, no conformidades, recomendaciones, adjuntos | Técnico Evaluador | ✅ Completo | PDF generado usando pdfkit. |
| RF-17 | Revisión del Coordinador: aprobar, devolver, solicitar corrección; bloqueo de datos tras envío | Coordinador | 🟡 Parcial | Endpoint de revisión existe. El trigger de bloqueo (`trg_eval_bloqueada`) está en `db/01_schema.sql`; no verificado si está replicado en la migración de Prisma |
| RF-18 | Gestión de correcciones: ver observaciones, corregir, reenviar | Técnico Evaluador | ✅ Completo | Endpoints de corrección implementados en evaluaciones.controller.ts. |
| RF-19 | Cierre de expediente: resultado final, fecha de cierre, informe oficial, descarga PDF | Coordinador | ✅ Completo | Cierre genera PDF exitosamente. |
| RF-20 | Consulta histórica: búsqueda por empresa, solicitud, evaluación, fecha, estado | Todos (según permisos) | 🟡 Parcial | Endpoint de búsqueda existe; filtros exactos no auditados a fondo |

## 3. Motor de riesgo — fórmulas exactas (RF-14)

Todas las cifras siguientes son **datos parametrizados en base de datos**, no constantes en código — se listan aquí solo como referencia de los valores actualmente cargados.

```
% cumplimiento = puntos_obtenidos / (total_posible − puntos_excluidos_N/A)
```
Escala de respuesta: Cumple = 1.0 · Cumple Parcial = 0.5 · Incumple Totalmente = 0.0 · No Aplica = excluido del denominador (no vale cero).

```
RE = Σ (puntaje_factor × peso_factor)   sobre 6 factores, pesos suman exactamente 1.0000
```

| # | Factor | Peso | Puntajes de opción |
|---|---|---|---|
| 1 | Volumen de producción | 0.16 | 3.00 / 2.33 / 1.67 / 1.00 |
| 2 | Implementación HACCP | 0.09 | 3.00 / 2.33 / 1.67 / 1.00 |
| 3 | Cumplimiento BPM (automático, derivado del % de la misma evaluación) | **0.56** | ≤60%→3.00 · >60–70%→2.33 · >70–80%→1.67 · >80%→1.00 |
| 4 | Proveedor INABIE | 0.05 | 3.00 / 2.33 / 1.67 / 1.00 |
| 5 | Rechazos de Registro Sanitario | 0.06 | 3.00 / 2.33 / 1.67 / 1.00 |
| 6 | Plan de muestreo microbiológico | 0.08 | 3.00 / 2.33 / 1.67 / 1.00 |

```
RP = MAX(nivel_riesgo)  sobre las categorías de alimento que elabora el establecimiento
RT = RP × RE
```

| RT | Nivel de riesgo | Frecuencia de inspección |
|---|---|---|
| 1.0 – 3.6 | Bajo | Anual |
| >3.6 – 6.3 | Medio | Semestral |
| >6.3 – 9.0 | Alto | Trimestral |

**Regla de aprobación:**
```
SI No Conformidades Críticas > 1                         → No aprueba, corregir de inmediato
SI % cumplimiento > 60 Y No Conformidades Mayores ≤ 5     → Aprueba
EN CUALQUIER OTRO CASO                                    → No aprueba, plan de corrección
```
Permiso sanitario: % cumplimiento > 81 (más el supuesto A-07 — ver §5).

## 4. Requisitos no funcionales

| ID | Requisito | Fuente | Estado real |
|---|---|---|---|
| RNF-01 | PWA: instalable, funciona sin conexión, sincroniza | SRS | ✅ Completo | Infraestructura PWA completa. 25 pantallas construidas y probadas. |
| RNF-02 | Seguridad: JWT, RBAC | SRS | 🟡 Parcial — ver `07-SEGURIDAD.md` |
| RNF-05 | Compatibilidad Chrome/Edge/Firefox/Safari, Android/iOS/Windows/macOS | SRS | 🟡 Parcial | Ash verificó Chrome desktop (build de producción, `localhost:4173`), Service Worker y manifest correctos. Pendiente (asignado a QA/Rowlis): Firefox/Safari/Edge escritorio, Android (Chrome), iOS (Safari), sincronización offline real. |
| RNF-add | Precisión numérica del motor de riesgo | Equipo (`docs/hallazgos.md`) | ✅ Cumplido — `numeric(8,4)` en base de datos y `decimal.js` con precisión 20 en TS, redondeo único al final. Con 2 decimales, 31 de 12.288 combinaciones posibles clasifican mal la frecuencia |
| RNF-add | Cero números de dominio hardcodeados en código | Equipo (regla no negociable) | ✅ Cumplido en `packages/risk-engine` |

## 5. Ambigüedades y supuestos bloqueantes (`docs/hallazgos.md`)

| ID | Descripción | Estado |
|---|---|---|
| **A-01** | Conversión de escala 2–8 (matriz de alimentos) a Bajo/Medio/Alto (1–3, para frecuencia). No está definida en ningún Excel fuente. | **Bloqueante.** Cargado como supuesto (`es_supuesto=TRUE`): 2.0–2.9→Bajo, 3.0–5.9→Medio, 6.0–8.0→Alto |
| **A-02** | ¿Quién asigna la criticidad Crítico/Mayor/Menor a los 45 criterios de la ficha? | **Bloqueante.** Columna `item_ficha.criticidad_id` nullable, sin resolver |
| **A-07** | ¿El permiso sanitario depende de que la inspección también apruebe, no solo de superar el 81%? | Se asumió que sí; documentado en la función de aprobación del motor |
| D-01 | El Excel original calcula mal el Factor 6 por comparación de texto rota; el RE del ejemplo (1.2067) debía ser 1.3931 | Resuelto por diseño (FK en vez de texto libre) |
| D-02 a D-06 | Filas `#N/A`, subcategorías sin nivel de riesgo, columna de criticidad vacía, jerarquía solo en texto, categoría sin subcategorías | Con manejo explícito en el esquema — ver `docs/hallazgos.md` para el detalle completo |

## 6. Dependencias principales entre requisitos

- RF-06 depende de RF-05, RF-08 y RF-09 (los tres orígenes ya implementados) y de RF-07 (el cuarto, pendiente).
- RF-12 y RF-13 dependen de RF-10 (asignación) y RF-11 (calendario).
- RF-14 (motor de riesgo) es consumido por RF-07 (programación automática) — RF-14 termina y dispara correctamente RF-07, cerrando el ciclo.
- RF-16 depende de RF-12/RF-13/RF-15 (contenido de la evaluación y sus evidencias).
- RF-17 depende de RF-16; RF-18 depende de RF-17 (devolución).
- RF-19 depende de RF-17 (aprobación) y de RF-16 (informe, incluyendo el PDF pendiente).
- RF-20 es transversal a todos los módulos con datos históricos.
- RNF-01 (offline) es transversal a RF-12, RF-13 y RF-15 — son los flujos que ocurren en campo, sin conexión garantizada.

## 7. Criterios de aceptación trazables

| Criterio | Requisitos relacionados | Estado |
|---|---|---|
| Cálculo de riesgo correcto y verificable | RF-14 | ✅ Cumplido |
| Ciclo cerrado: resultado programa la siguiente inspección | RF-07, RF-14 | ✅ Cumplido |
| Datos bloqueados tras envío | RF-17 | 🟡 Cumplido en SQL, no verificado en Prisma |
| Ningún número de dominio en código | Transversal | ✅ Cumplido en `risk-engine` |
| Funcionamiento offline | RNF-01 | ✅ Cumplido — PWA frontend implementado con 25 pantallas |
| Seguridad (JWT + RBAC mínimo del SRS) | RNF-02 | 🟡 Cumplido parcialmente, ver `07-SEGURIDAD.md` |

## 8. Información que requiere refinamiento antes de producción

- Tiempo máximo de respuesta esperado.
- Número de usuarios concurrentes.
- Volumen esperado de evaluaciones por período.
- Política de retención de auditoría (la tabla existe, nada escribe en ella todavía).
- Estrategia exacta de compresión y almacenamiento de evidencias multimedia grandes en modo offline.
