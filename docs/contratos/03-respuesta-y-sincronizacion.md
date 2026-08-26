# Contrato 03 — Respuesta capturada y lote de sincronización

**Lo entregan:** Integrante 1 y Integrante 3, en conjunto
**Lo consume:** Integrante 4 (y lo usa también el Integrante 3 para construir la cola)
**Se cierra el:** viernes 28 de agosto
**Estado:** Borrador

---

## Qué resuelve este contrato

Es el contrato más delicado del proyecto porque conecta tres roles a la vez: el
Integrante 3 lo genera en el dispositivo sin conexión, el Integrante 1 lo recibe en
el servidor, y el Integrante 4 lo dispara desde la pantalla de evaluación. Los tres
deben coincidir exactamente en la forma, porque de aquí depende que reenviar datos
no los duplique.

## 1. Forma de una respuesta individual capturada en la aplicación

```json
{
  "uuidLocal": "",
  "idItemFicha": 0,
  "idOpcionRespuesta": 0,
  "observacion": "",
  "fechaCaptura": ""
}
```

> `uuidLocal` se genera en el dispositivo, nunca en el servidor. Es la base de que
> reenviar el mismo dato no lo duplique. Confirmar: ¿qué formato de identificador
> se usa? (recomendado: UUID versión 4)

**Decisión sobre el formato del identificador:** ____________________

## 2. Forma de una evidencia (fotografía) capturada

```json
{
  "uuidLocal": "",
  "idRespuestaItem": null,
  "tipo": "FOTO",
  "nombreArchivo": "",
  "comentario": "",
  "fechaCaptura": ""
}
```

- ¿La fotografía en sí (los bytes de la imagen) viaja junto con este JSON o por separado?
- ¿Qué tamaño máximo se acepta después de comprimir en el dispositivo?

**Decisión:** ____________________

## 3. Forma del lote que se envía al sincronizar

```json
{
  "idEvaluacion": 0,
  "versionRegistro": 0,
  "respuestas": [],
  "evidencias": []
}
```

## 4. Qué responde el servidor al recibir un lote

```json
{
  "aceptadas": [""],
  "rechazadas": [
    { "uuidLocal": "", "motivo": "" }
  ],
  "versionRegistroActual": 0
}
```

- ¿Qué pasa si el lote llega repetido? El servidor debe responder que ya estaba
  aceptado, no como un error — confirmar el código de estado HTTP para ese caso.
- ¿Qué pasa si `versionRegistro` que envía el dispositivo es menor a la que tiene
  el servidor? (esto indica un conflicto — ver el documento de estrategia offline)

**Decisiones:** ____________________

## 5. Endpoint de sincronización

```
POST /
```

---

**Firma de acuerdo:**

- Integrante 1: ____
- Integrante 3: ____
- Integrante 4: ____
