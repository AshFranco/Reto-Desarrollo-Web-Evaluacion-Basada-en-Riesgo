# Contrato 02 — Árbol del catálogo de la ficha de inspección

**Lo entrega:** Integrante 2
**Lo consumen:** Integrantes 3, 4
**Se cierra el:** miércoles 26 de agosto
**Estado:** Borrador — llenar en cuanto el esquema esté migrado

---

## Qué resuelve este contrato

El componente de formulario dinámico (Integrante 4) y el almacenamiento local del
catálogo (Integrante 3) necesitan saber, sin ambigüedad, cómo se representa un
elemento de la ficha de inspección y cómo se anida dentro de otro. Este contrato
fija esa forma para que ambos puedan construir sin esperar al endpoint terminado.

## 1. Forma de un elemento del árbol

```json
{
  "id": 0,
  "idPadre": null,
  "numeracion": "1.1.3",
  "titulo": "",
  "nivel": 0,
  "orden": 0,
  "esEvaluable": false,
  "peso": 1.0,
  "idCriticidad": null,
  "hijos": []
}
```

> Decidir en conjunto: ¿el endpoint devuelve el árbol ya anidado (con `hijos`
> conteniendo a sus descendientes), o devuelve una lista plana y cada quien arma
> el árbol con `idPadre`? Esto cambia cómo se construyen ambos componentes —
> hay que decidirlo una sola vez y que los dos lo sepan antes de empezar.

**Decisión:** ____________________

## 2. Forma de las opciones de respuesta (C, CP, IT, N/A)

```json
{
  "id": 0,
  "codigo": "",
  "nombre": "",
  "valor": 0,
  "excluyeDelCalculo": false,
  "generaNc": false
}
```

## 3. Endpoint que entrega el catálogo completo

```
GET /
```

- ¿Devuelve la versión publicada actual automáticamente, o hay que pedir la versión por id?
- ¿En una sola llamada vienen el árbol y las opciones de respuesta, o son dos llamadas separadas?

**Decisión:** ____________________

## 4. Literales (los sub-puntos a, b, c de un criterio evaluable)

```json
{
  "id": 0,
  "letra": "",
  "texto": "",
  "orden": 0
}
```

¿Van anidados dentro del elemento evaluable, o se piden aparte?

**Decisión:** ____________________

## 5. Qué necesita el Integrante 3 para guardar esto sin conexión

- ¿Se descarga el árbol completo de una vez al iniciar sesión, o por partes?
- ¿Cómo sabe la aplicación si el catálogo local está desactualizado respecto al del servidor? (por ejemplo, comparando el número de versión)

---

**Firma de acuerdo:**

- Integrante 2: ____
- Integrante 3: ____
- Integrante 4: ____
