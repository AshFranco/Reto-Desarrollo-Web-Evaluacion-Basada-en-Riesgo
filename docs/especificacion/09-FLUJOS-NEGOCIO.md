# 09 - Flujos de Negocio

## 1. Objetivo

Documentar los flujos principales del sistema EBR/BPM, con énfasis en el flujo central que define la arquitectura del proyecto: **el ciclo cerrado de evaluación → cálculo de riesgo → reprogramación automática.**

## 2. El flujo central: la cadena de cálculo en ciclo

```text
Ficha BPM (45 criterios)
      ↓  % cumplimiento = puntos / (total − puntos N/A)
Factor 3 "Cumplimiento BPM"  ← peso 0.56 de 1.00
      ↓
RE = Σ (puntaje × peso) sobre 6 factores
      ×
RP = mayor nivel de riesgo entre las categorías de alimento que elabora
      ↓
RT = RP × RE  →  1.0–3.6 Anual · >3.6–6.3 Semestral · >6.3 Trimestral
      ↓
Se programa la próxima inspección → vuelve a alimentar la cadena
```

**Estado real de este flujo:** el tramo desde "Ficha BPM" hasta "RT" está ✅ completo e implementado en `packages/risk-engine`, con verificación independiente en PL/pgSQL. El último paso — "se programa la próxima inspección" — está ✅ implementado únicamente en `db/05_funciones.sql`, **no en el backend NestJS**. Esto significa que hoy, si se usa la API real (`motor-riesgo.service.ts`), el ciclo se calcula pero no se cierra: nadie programa automáticamente la siguiente inspección. Es el hallazgo más importante de todo este documento.

## 3. Flujo: Solicitud → Caso → Evaluación

```text
Administrador Empresa / Usuario Delegado
   |
Crear solicitud BPM (borrador)
   |
Completar datos + adjuntar documentación
   |
Enviar solicitud
   |
Estado: Pendiente de Asignación
   |
Se crea un Caso (origen: solicitud_bpm)
   |
Coordinador asigna Técnico Evaluador
   |
Se programa la inspección (fecha, prioridad)
```
**Estado: ✅ completo a nivel de API** (RF-05, parte de RF-06, RF-10).

## 4. Flujo: Alerta LAPCH → Caso

```text
Coordinador / Administrador
   |
Registrar alerta (número, fecha, producto, empresa, descripción)
   |
Evaluar: ¿procede?
   |
Si procede -> Se crea un Caso (origen: alerta_lapch) -> Generar evaluación
Si no procede -> Cerrar caso sin evaluación
```
**Estado: ✅ completo.**

## 5. Flujo: Denuncia → Caso

```text
Cualquier denunciante (posiblemente anónimo)
   |
Registrar denuncia (tipo, fecha, denunciante, descripción)
   |
Coordinador evalúa: ¿procede?
   |
Procede -> Se crea un Caso (origen: denuncia)
No procede -> Cerrar sin evaluación
Remisión -> Derivar a otro proceso (fuera del alcance del sistema)
```
**Estado: ✅ completo.**

## 6. Flujo: Programación institucional → Caso (el cuarto origen)

```text
Sistema (al cerrar una evaluación anterior)
   |
Calcular riesgo -> obtener frecuencia (Anual/Semestral/Trimestral)
   |
Insertar ProgramacionInstitucional con fecha de próxima inspección
   |
Se crea un Caso (origen: programacion_institucional)
   |
Vuelve a alimentar el flujo de asignación (§3, desde "Coordinador asigna")
```
**Estado: ❌ no implementado en el backend.** Este es el cuarto origen de caso descrito en RF-06, y es el que cierra el ciclo. Existe en `db/05_funciones.sql` pero no está portado a `motor-riesgo.service.ts`. Sin este paso, el sistema depende de que alguien programe manualmente cada reinspección, lo cual contradice el diseño documentado del proyecto.

## 7. Flujo: Ejecución de evaluación en campo

```text
Técnico Evaluador
   |
Iniciar evaluación asignada
   |
Capturar información general, procesos, personal, infraestructura
   |
Responder cada criterio: Cumple / No Cumple / No Aplica
   |
Adjuntar evidencias (fotos, documentos, video, geolocalización opcional)
   |
Guardar avance (repetible) o Finalizar
   |
Dispara: cálculo de riesgo (§2)
```
**Estado: 🟡 parcial** — los endpoints existen, pero sin frontend ni cliente offline, este flujo hoy solo puede ejercitarse llamando directamente a la API.

## 8. Flujo: Revisión y cierre

```text
Evaluación finalizada -> Informe generado (texto, sin PDF todavía)
   |
Coordinador revisa
   |
   |--- Aprobar ---> Datos bloqueados (trigger) -> Cerrar expediente -> §6 (reprograma)
   |
   |--- Devolver / Solicitar corrección ---> Técnico corrige y reenvía (RF-18, no verificado)
   |                                              |
   |                                              v
   |                                         vuelve a "Coordinador revisa"
```
**Estado: 🟡 parcial.** El bloqueo de datos tras aprobación está implementado como trigger SQL (`trg_eval_bloqueada`), no verificado si está replicado en la migración de Prisma. El ciclo de corrección-reenvío (RF-18) no tiene endpoint identificado.

## 9. Flujo: Cálculo de aprobación y permiso sanitario

```text
% cumplimiento y no conformidades ya calculados
   |
¿NC Críticas > 1?
   |--- Sí ---> No aprueba, corregir de inmediato
   |--- No ---> ¿% > 60 Y NC Mayores ≤ 5?
                    |--- Sí ---> Aprueba
                    |--- No ---> No aprueba, plan de corrección

Adicionalmente: ¿% > 81?
   |--- Sí ---> Elegible para permiso sanitario
                  (supuesto A-07: se asume que también requiere que la
                   inspección haya aprobado — no confirmado por DIGEMAPS)
```

## 10. Flujo: Sincronización offline (propuesto, no implementado)

```text
Técnico en campo, sin conexión
   |
Todas las operaciones (respuestas, evidencias) se generan con uuid_local
   |
Se encolan en operacion_pendiente (local)
   |
Al recuperar conexión:
   |
Sincronizar operacion_pendiente con el servidor, en orden, de forma idempotente
   |
Servidor recalcula/valida (autoridad final)
```
**Estado: ❌ no implementado.** La infraestructura de datos existe (`uuid_local`, `operacion_pendiente`), pero no hay ningún cliente PWA que la use, porque el frontend no existe todavía.

## 11. Reglas transversales a todos los flujos

- Ninguna operación de escritura sobre `caso`, `evaluacion` o `calculo_riesgo` debe dejar el sistema en un estado inconsistente — deben ser transaccionales.
- Un ticket... **(nota: no aplica a este proyecto — ver aclaración abajo)**.
- Una evaluación bloqueada no admite cambios en sus respuestas.
- Toda creación de `Caso` debe tener exactamente un origen (CHECK de base de datos).
- El servidor es siempre la autoridad final del cálculo de riesgo, incluso si el cliente offline mostró un valor local con `packages/risk-engine`.

> Nota de honestidad documental: el flujo de "reutilización de ticket" que aparece en documentación de otros proyectos de referencia no aplica aquí — EBR/BPM no emite tickets ni códigos QR; ese es un dominio distinto. Se aclara explícitamente para evitar que quede una regla importada por error de otro contexto.

## 12. Casos pendientes de refinamiento con DIGEMAPS

- Proceso exacto de reprogramación/cancelación de una inspección ya programada (RF-07 menciona la capacidad, sin detallar reglas).
- Qué ocurre si un Técnico Evaluador es reasignado a mitad de una evaluación en curso.
- Si una evaluación devuelta por el Coordinador puede reabrir el bloqueo de datos, o si genera una nueva evaluación en su lugar.
