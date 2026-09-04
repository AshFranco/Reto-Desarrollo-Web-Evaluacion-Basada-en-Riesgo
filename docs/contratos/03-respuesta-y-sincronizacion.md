# Contrato 03 — Respuesta capturada y sincronización offline

**Lo entregan:** Integrante 1 (backend) y Integrante 3 (PWA cliente)  
**Lo consume:** Integrante 4 (pantalla de evaluación)  
**Se cierra el:** viernes 28 de agosto  
**Estado:** Cerrado — completado a partir del código en `feat/EBR-backend-api` · Integrante 3 · 2026-09-03

---

## Qué resuelve este contrato

Define la forma exacta en que el Integrante 3 captura respuestas en el dispositivo
offline y las envía al servidor cuando recupera conexión.

## 1. Forma de una respuesta capturada en el dispositivo (almacenamiento local)

```json
{
  "uuidLocal": "550e8400-e29b-41d4-a716-446655440000",
  "evaluacionId": "42",
  "itemId": "45",
  "codigoOpcion": "CP",
  "nivelCriticidad": "M",
  "observacion": "Piso con grietas en esquina noreste",
  "capturaEn": 1725368400000
}
```

- `uuidLocal`: UUID v4 generado con `crypto.randomUUID()` en el cliente. Garantiza idempotencia local.
- `itemId`: string (ID de BigInt del backend).
- `codigoOpcion`: `'C' | 'CP' | 'IT' | 'N/A'`
- `nivelCriticidad`: **requerido** cuando `codigoOpcion` es `'CP'` o `'IT'`. Valores: `'C' | 'M' | 'Me'`. `null` para `'C'` y `'N/A'`.
- `capturaEn`: timestamp Unix en milisegundos.

## 2. Cómo se envían las respuestas al servidor

No hay endpoint de sincronización en lote. El flujo es individual por evaluación:

### Paso 1 — Iniciar la evaluación en el servidor

```
POST /api/v1/evaluaciones/:id/iniciar
Authorization: Bearer <accessToken>
```

Transiciona la evaluación de `Programada` → `En_Curso`. Solo `TECNICO_EVALUADOR`.

### Paso 2 — Enviar las respuestas capturadas

```
POST /api/v1/evaluaciones/:id/respuestas
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "respuestas": [
    {
      "itemId": "45",
      "codigoOpcion": "CP",
      "nivelCriticidad": "M",
      "observacion": "Piso con grietas en esquina noreste"
    },
    {
      "itemId": "46",
      "codigoOpcion": "C"
    }
  ]
}
```

- Se pueden enviar múltiples respuestas en un solo request.
- El servidor hace `upsert` por `(evaluacion, item)` — reenviar las mismas respuestas es idempotente.
- `nivelCriticidad` es obligatorio si `codigoOpcion` es `CP` o `IT`.
- `observacion` es opcional, máximo 2000 caracteres.

### Paso 3 — Finalizar la evaluación

```
POST /api/v1/evaluaciones/:id/finalizar
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "observacionesFinales": "Texto opcional del técnico"
}
```

Valida que todos los ítems evaluables tengan respuesta. Bloquea la evaluación.

## 3. Forma de una evidencia (fotografía) capturada en el dispositivo

```json
{
  "uuidLocal": "660e8400-e29b-41d4-a716-446655440001",
  "itemId": "45",
  "blob": "<Blob JPEG comprimido>",
  "nombreArchivo": "piso-grieta.jpg",
  "comentario": "Grieta visible en esquina noreste",
  "capturaEn": 1725368400000,
  "subida": false
}
```

## 4. Cómo se sube una evidencia al servidor

```
POST /api/v1/evidencias
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

archivo: [Blob JPEG, máx. 300 KB tras compresión en cliente]
evaluacionId: "42"
respuestaItemId: "45"
tipo: "FOTO"
```

- Un request por foto.
- El campo del archivo se llama `archivo`.
- El servidor acepta hasta **15 MB**, pero el cliente comprime a ≤ 300 KB antes de subir (800 px máx., JPEG 0.7, segunda pasada a 0.5 si sigue >300 KB).
- `respuestaItemId` es opcional (referencia al ítem respondido, no el UUID local).

## 5. Flujo de sincronización offline

```
Dispositivo sin conexión → Captura respuestas en IndexedDB → Encola en cola_sync
Recupera red → SyncProcessor despierta
  → POST /api/v1/auth/refresh  (cookie automática)
  → POST /api/v1/evaluaciones/:id/iniciar
  → POST /api/v1/evaluaciones/:id/respuestas  (todas en un lote)
  → POST /api/v1/evidencias   (una por foto, en paralelo o secuencial)
  → POST /api/v1/evaluaciones/:id/finalizar
  → Marcar evaluación como sincronizada en IndexedDB
```

## 6. Idempotencia

El servidor hace `upsert` en `respuesta_item` por `(idEvaluacion, idItemFicha)`.
Reenviar las mismas respuestas no las duplica. Por eso no se necesita UUID en el payload
del servidor — el UUID local (`uuidLocal`) es solo para gestión interna del cliente.

---

**Firma de acuerdo:**

- Integrante 1: _(pendiente — confirmar que upsert es idempotente y que se puede llamar `/iniciar` más de una vez sin error)_
- Integrante 3: Int-3 · 2026-09-03 _(completado desde código `feat/EBR-backend-api`)_
- Integrante 4: ____
