# Contrato 02 — Árbol del catálogo de la ficha de inspección

**Lo entrega:** Integrante 1 (Gabriela — backend `apps/api`)  
**Lo consumen:** Integrantes 3, 4  
**Se cierra el:** miércoles 26 de agosto  
**Estado:** Cerrado — completado a partir del código en `feat/EBR-backend-api` · Integrante 3 · 2026-09-03

---

## Qué resuelve este contrato

El componente de formulario dinámico (Integrante 4) y el almacenamiento local del
catálogo (Integrante 3) necesitan saber, sin ambigüedad, cómo se representa un
elemento de la ficha de inspección y cómo se anida dentro de otro.

## 1. Endpoint del catálogo

```
GET /api/v1/formularios/vigente
Authorization: Bearer <accessToken>
```

Devuelve la versión activa (`estado: 'Activa'`) más reciente. No se necesita pasar ID.

## 2. Forma de la respuesta

```json
{
  "id": "1",
  "secciones": [
    {
      "id": "1",
      "idPadre": null,
      "numeracion": "1",
      "titulo": "Condiciones de Infraestructura",
      "nivel": 1,
      "orden": 1,
      "esEvaluable": false,
      "peso": 0,
      "idCriticidad": null,
      "hijos": [
        {
          "id": "45",
          "idPadre": "1",
          "numeracion": "1.1.3",
          "titulo": "Estructuras internas y accesorios",
          "nivel": 4,
          "orden": 3,
          "esEvaluable": true,
          "peso": 1.0,
          "idCriticidad": "1",
          "hijos": []
        }
      ]
    }
  ],
  "opcionesRespuesta": [
    { "id": "1", "codigo": "C",   "nombre": "Cumple",               "valor": 1.0, "excluyeDelCalculo": false, "generaNc": false },
    { "id": "2", "codigo": "CP",  "nombre": "Cumplimiento parcial",  "valor": 0.5, "excluyeDelCalculo": false, "generaNc": true  },
    { "id": "3", "codigo": "IT",  "nombre": "Incumple totalmente",   "valor": 0.0, "excluyeDelCalculo": false, "generaNc": true  },
    { "id": "4", "codigo": "N/A", "nombre": "No aplica",             "valor": 0.0, "excluyeDelCalculo": true,  "generaNc": false }
  ]
}
```

**Decisiones de diseño confirmadas desde el código del backend:**

- El backend construye el árbol **anidado** en memoria usando `idPadre` antes de responder. El frontend recibe el árbol ya armado con `hijos`.
- Todos los IDs son **strings** (BigInt serializado).
- El campo se llama `secciones` (no `items`) y `opcionesRespuesta` (no `opciones`).

## 3. Lo que el endpoint NO incluye (brecha conocida)

El endpoint **no devuelve**:
- `factores` de riesgo del establecimiento
- `rangos` de frecuencia de inspección
- `rangosCalificacion`
- `reglaAprobacion`

Estos datos son necesarios para que el Integrante 3 calcule el riesgo en tiempo real
con `@ebr/risk-engine`. El cálculo oficial se hace en el backend vía
`POST /api/v1/motor-riesgo/calcular`. El cálculo en cliente es solo orientativo.

**Decisión del Integrante 3:** El hook `useMotorRiesgo` retornará `null` hasta que
el equipo defina un endpoint que sirva estos datos. La captura de respuestas offline
no se bloquea por esta brecha.

## 4. Cómo el Integrante 3 aplanará el árbol para IndexedDB

El backend devuelve árbol anidado. El frontend lo aplana al guardarlo:

```typescript
// Aplanar recursivamente
function aplanar(nodos: NodoCatalogo[], version: string): CatalogoItemLocal[] {
  return nodos.flatMap(({ hijos, ...nodo }) => [
    { ...nodo, versionFichaId: version },
    ...aplanar(hijos, version),
  ]);
}
```

Se guarda como lista plana en `catalogo_item` de IndexedDB para poder actualizar
un ítem sin reescribir el árbol completo.

## 5. Detección de versión desactualizada

El campo `id` de la respuesta es el `versionFichaId`. El cliente compara este ID
con el que tiene almacenado en `catalogo_meta`. Si difieren, descarga el catálogo completo.

> **Nota:** El header `X-Ficha-Version` propuesto anteriormente **no está implementado**
> en el backend. Se usará el campo `id` de la respuesta en su lugar.

---

**Firma de acuerdo:**

- Integrante 1: _(pendiente — confirmar nombres de campo y si se añadirán factores/rangos)_
- Integrante 3: Int-3 · 2026-09-03 _(completado desde código `feat/EBR-backend-api`)_
- Integrante 4: ____
