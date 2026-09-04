# 01 - Alcance del Proyecto

## 1. Objetivo

Definir el alcance funcional y técnico del **Sistema PWA para Evaluación Basada en Riesgo (EBR/BPM)**, tomando como referencia la Especificación de Requisitos de Software (SRS) — Reto Julio-Septiembre 2026 — y el estado real verificado del repositorio a la fecha de este documento (2026-09-03).

**Cliente:** Ministerio de Salud Pública — DIGEMAPS
**Entrega:** viernes 25 de septiembre de 2026

El sistema busca gestionar el ciclo completo de Evaluaciones Basadas en Riesgo (EBR) de establecimientos sujetos a inspección de Buenas Prácticas de Manufactura (BPM): planificación, ejecución, seguimiento, evaluación, cálculo de riesgo y cierre de procesos de inspección — con la particularidad de que el resultado de cada inspección determina automáticamente cuándo debe ocurrir la siguiente. No es un flujo lineal, es un ciclo cerrado.

## 2. Alcance funcional incluido

Según el SRS, el proyecto contempla:

- Registro y autenticación de usuarios, con doble factor opcional.
- Gestión de empresas y establecimientos.
- Gestión de solicitudes BPM iniciadas por la empresa.
- Gestión unificada de casos con cuatro orígenes posibles: solicitud de empresa, programación institucional, alerta LAPCH, denuncia o reporte.
- Planificación y asignación de inspecciones.
- Captura de hallazgos en campo mediante una ficha jerárquica de 45 criterios evaluables.
- Cálculo automático del nivel de riesgo (motor de riesgo) y de la frecuencia de la siguiente inspección.
- Gestión documental y de evidencias (fotos, documentos, video, geolocalización opcional).
- Generación de informes de evaluación.
- Revisión y aprobación por parte del Coordinador, con bloqueo de datos tras el envío.
- Cierre de expediente.
- Consulta histórica.
- Funcionamiento offline mediante capacidades PWA.

> El SRS aclara explícitamente: *"Se entregará un script con la estructura de las preguntas y la puntuación de las preguntas."* — es decir, la ficha BPM y su puntuación no se diseñan libremente; vienen de un archivo fuente oficial (ya cargado en base de datos, ver `05-MODELO-DATOS.md`).

## 3. Procesos principales cubiertos

1. Registrar y autenticar usuarios según rol.
2. Registrar y gestionar empresas y establecimientos.
3. Originar un caso de evaluación por cualquiera de los cuatro escenarios (RF-06).
4. Asignar un técnico evaluador y programar la inspección.
5. Capturar la ficha BPM en campo (Cumple / No Cumple / No Aplica por criterio).
6. Calcular automáticamente puntaje, porcentaje de cumplimiento, nivel de riesgo (RE, RP, RT) y frecuencia de la próxima inspección.
7. Capturar evidencias fotográficas, documentales y de video.
8. Generar el informe de evaluación.
9. Revisar el informe (aprobar, devolver, solicitar corrección) con bloqueo de datos tras envío.
10. Programar automáticamente la siguiente inspección según la frecuencia calculada, cerrando el ciclo.
11. Cerrar el expediente y emitir el resultado final.
12. Consultar el histórico por empresa, solicitud, evaluación, fecha o estado.
13. Operar sin conexión y sincronizar al recuperar internet.

## 4. Actores contemplados

| Rol | Descripción (SRS) |
|---|---|
| Administrador | Configura catálogos, parámetros y usuarios |
| Administrador Empresa | Gestiona solicitudes de la empresa |
| Usuario Delegado | Actúa en representación de la empresa |
| Coordinador | Asigna evaluaciones y revisa informes |
| Técnico Evaluador | Realiza evaluaciones e inspecciones |

## 5. Requisitos de calidad y seguridad incluidos

Según el SRS (RNF-01, RNF-02, RNF-05):

- Instalación como PWA en móvil y escritorio.
- Funcionamiento sin conexión, con sincronización al recuperar internet.
- Autenticación mediante JWT.
- Control de acceso basado en roles (RBAC).
- Compatibilidad con Chrome, Edge, Firefox y Safari, en Android, iOS, Windows y macOS.

> El SRS es breve en el capítulo de seguridad (solo JWT + RBAC). El resto de mecanismos de seguridad descritos en `07-SEGURIDAD.md` (Argon2id, throttling, cifrado en reposo, cabeceras, etc.) son decisiones técnicas del equipo, no requisitos textuales del SRS — se marcan como tal.

## 6. Decisiones técnicas del equipo

El SRS deja el backend abierto entre **.NET 9 Web API + Entity Framework Core** o **NodeJS + Express**, y el frontend entre JavaScript o TypeScript con Material Design. El equipo, mediante `docs/adr/001-stack.md`, ha propuesto:

- Backend: **NestJS + TypeScript + Prisma + PostgreSQL**.
- Motor de riesgo: paquete TypeScript compartido (`packages/risk-engine`), importado tanto por el backend como por el frontend, con verificación cruzada en PL/pgSQL.
- Frontend web: **React + Vite** (PWA), con capacidades offline.
- Base de datos: PostgreSQL 16, con un esquema SQL versionado de 51 tablas como fuente de verdad del dominio.

**Estado real de esta decisión: PROPUESTO, no ratificado formalmente.** `docs/adr/001-stack.md` indica explícitamente "Estado: PROPUESTO — pendiente de ratificación", y `docs/plan-maestro.md` contiene una recomendación distinta y más antigua (.NET 9 + EF Core) que no fue actualizada cuando se decidió el stack real. La única implementación existente (backend en `apps/api`) sigue NestJS + Prisma, pero vive en una rama sin fusionar a `main`. Ver `12-PLANIFICACION.md` §2 para el detalle de esta decisión pendiente.

## 7. Aspectos no definidos explícitamente por el SRS

- Contrato detallado de cada endpoint.
- Diseño visual final del frontend.
- Estrategia exacta de compresión/almacenamiento de evidencias multimedia.
- Regla de conversión entre la escala 2–8 de la matriz de alimentos y la escala Bajo/Medio/Alto de frecuencia (**A-01**, bloqueante).
- Quién asigna la criticidad Crítico/Mayor/Menor a cada uno de los 45 criterios de la ficha (**A-02**, bloqueante).
- Si el permiso sanitario depende de que la inspección apruebe además de superar el 81% (**A-07**).
- Política de retención de auditoría.
- Proveedor de correo/SMS si se usan las integraciones opcionales.

Estos puntos no deben asumirse como cerrados sin respuesta de DIGEMAPS o aprobación explícita del equipo. Ver `docs/hallazgos.md` para el detalle completo de los defectos encontrados en los archivos fuente Excel.

## 8. Entregables documentales previstos

- Alcance (este documento).
- Arquitectura.
- Requisitos detallados.
- Casos de uso.
- Modelo de datos.
- Diseño de API REST.
- Estrategia de seguridad.
- Matriz de roles y permisos.
- Flujos de negocio.
- Plan de pruebas.
- Estrategia de despliegue.
- Planificación de desarrollo.

## 9. Criterios generales de aceptación

La solución será aceptada cuando se cumpla, como mínimo:

1. El motor de riesgo calcula RE, RP, RT y frecuencia de forma correcta y verificable (ya cumplido a nivel de librería — ver `03-REQUISITOS.md`, RF-14).
2. El ciclo se cierra: el resultado de una inspección programa automáticamente la siguiente.
3. Ningún número del dominio (pesos, umbrales, puntajes) está escrito en el código — todo viene de base de datos.
4. Los datos de una evaluación quedan bloqueados tras el envío (RF-17).
5. El sistema funciona sin conexión y sincroniza correctamente.
6. Se cumplen los requisitos de seguridad definidos en `07-SEGURIDAD.md`.
7. Los tres supuestos bloqueantes (A-01, A-02, A-07) están resueltos o formalmente aceptados como definitivos por el equipo/cliente.
