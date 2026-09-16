# Bitácora de Chequeos y Retroalimentación — EBR/BPM

Este directorio contiene los documentos oficiales de retroalimentación y chequeos de validación técnica realizados sobre el sistema **PWA de Evaluación Basada en Riesgo (EBR/BPM)**, junto con el estado de atención y resolución de cada observación.

---

## 1. Documentos de Chequeos

| # | Archivo | Descripción Principal | Estado de Resolución |
|---|---|---|---|
| **01** | [`01-Primer-Chequeo.pdf`](./01-Primer-Chequeo.pdf) | Notificaciones de actualización PWA, persistencia y arranque de sesión | ✅ Resuelto al 100% |
| **02** | [`02-Segundo-Chequeo.pdf`](./02-Segundo-Chequeo.pdf) | Validación de rangos cronológicos en filtros y fechas de creación | ✅ Resuelto al 100% |
| **03** | [`03-Tercer-Chequeo.pdf`](./03-Tercer-Chequeo.pdf) | Reapertura de evaluaciones BPM finalizadas para edición y corrección | ✅ Resuelto al 100% |
| **04** | [`04-Cuarto-Chequeo.pdf`](./04-Cuarto-Chequeo.pdf) | Salida cómoda y navegación segura en la ficha del técnico evaluador | ✅ Resuelto al 100% |
| **05** | [`05-Quinto-Chequeo.pdf`](./05-Quinto-Chequeo.pdf) | Gestión de estados de cuentas de usuario en el panel de Administración | ✅ Resuelto al 100% |
| **06** | [`06-Sexto-Chequeo.pdf`](./06-Sexto-Chequeo.pdf) | Unificación de botones de chequeo y simplificación de la ficha de campo | ✅ Resuelto al 100% |
| **07** | [`07-Septimo-Chequeo.pdf`](./07-Septimo-Chequeo.pdf) | Blindaje de acciones del coordinador, expedientes cerrados e historial | ✅ Resuelto al 100% |
| **08** | [`08-Octavo-Chequeo.pdf`](./08-Octavo-Chequeo.pdf) | Responsividad integral de dashboards, búsqueda rápida en ficha, reapertura de expedientes, modo solo lectura en consultas históricas y modal individual de localización geográfica por criterio | ✅ Resuelto al 100% |

---

## 2. Resumen de Mejoras Incorporadas en el Octavo Chequeo

1. **Diseño Responsivo Integral:** Adaptabilidad completa en todos los paneles (Coordinador, Administrador, Empresa, Técnico e Histórico).
2. **Buscador en Tiempo Real en la Ficha Técnica:** Permite filtrar instantáneamente por código o texto de cualquier criterio evaluable.
3. **Bloqueo en Expedientes Cerrados:** En los expedientes cerrados no se permite modificar la prioridad ni ejecutar acciones operativas.
4. **Consulta Histórica en Modo Solo Lectura:** Las inspecciones desde la vista histórica protegen la integridad de los datos evitando mutaciones.
5. **Modal Individual con Geolocalización GPS por Criterio:** Cada criterio evaluable cuenta con su propio modal donde se pueden subir archivos multimedia y capturar/guardar la ubicación geográfica GPS en formato GeoJSON.
6. **Advertencia de Eliminación de Evidencias:** Diálogo de confirmación con advertencia antes de suprimir cualquier archivo adjunto.
