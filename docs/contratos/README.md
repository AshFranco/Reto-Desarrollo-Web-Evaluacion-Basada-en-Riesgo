# Contratos entre roles

Esta carpeta contiene los acuerdos escritos sobre la forma exacta de los datos que
una parte del sistema entrega y que otra parte consume — lo que el plan maestro
llama "contratos". Existen para que los cinco integrantes puedan construir en
paralelo desde el primer día, sin que nadie tenga que esperar a que otra persona
termine su parte completa.

## Los cuatro contratos

| Archivo | Qué define | Lo entrega | Lo consumen | Se cierra el |
|---|---|---|---|---|
| `01-sesion-usuario.md` | Qué contiene el token de sesión y los datos del usuario autenticado | Integrante 1 | Integrantes 2, 3, 4 | Martes 25 de agosto |
| `02-arbol-catalogo.md` | Cómo se representa la ficha de inspección: jerarquía, preguntas, opciones | Integrante 2 | Integrantes 3, 4 | Miércoles 26 de agosto |
| `03-respuesta-y-sincronizacion.md` | Forma de una respuesta capturada y del lote que se sincroniza | Integrantes 1 y 3 | Integrante 4 | Viernes 28 de agosto |
| `04-motor-de-riesgo.md` | Referencia al contrato que ya existe en código — no se redacta desde cero | — | Integrantes 1, 3, 4 | Ya cerrado |

## Cómo se usa un contrato

1. Las dos partes se sientan —en persona o por llamada— y llenan el archivo juntas. No lo llena una sola persona y se lo manda a la otra: se define en conjunto, porque ambas partes tienen que estar de acuerdo con la forma exacta.
2. El archivo se llena con un **ejemplo real**, no solo con una descripción en palabras. Un ejemplo concreto de JSON no deja ambigüedad; una frase como "devuelve los datos del usuario" sí la deja.
3. En cuanto el archivo tiene el ejemplo, ambas partes pueden empezar a construir: quien lo consume, contra ese ejemplo como dato de prueba; quien lo entrega, construyendo la implementación real.
4. Si el contrato necesita cambiar a mitad de camino, se edita el mismo archivo, se avisa en la reunión diaria a todas las personas que lo consumen, y se actualiza el estado a "en revisión" hasta que todas confirmen el cambio.

## Estado de un contrato

Cada archivo tiene un campo `Estado` en su encabezado:

- **Borrador** — se está discutiendo, todavía no se puede construir contra él
- **Cerrado** — ya se puede construir contra él con confianza
- **En revisión** — estaba cerrado pero alguien propuso un cambio; avisar a quien lo consume antes de seguir construyendo contra la versión vieja
