# Contrato 04 — Motor de riesgo

**Lo entrega:** ya existe en el repositorio
**Lo consumen:** Integrantes 1, 3, 4
**Se cierra el:** ya cerrado — no hay que redactarlo, solo leerlo
**Estado:** Cerrado

---

## Por qué este contrato no se redacta desde cero

A diferencia de los otros tres, este contrato no se define en una reunión: ya está
escrito, con precisión total, en el código del paquete `packages/risk-engine`. Ese
paquete tiene 17 pruebas automatizadas en verde y define exactamente qué datos
recibe y qué datos entrega el cálculo completo del riesgo.

Redactar este contrato en un documento aparte sería mantener la misma información
en dos lugares, con el riesgo de que se desactualicen entre sí. En vez de eso, este
archivo señala dónde está la fuente real.

## Dónde consultarlo

**Archivo fuente:** `packages/risk-engine/src/index.ts`
**Pruebas:** `packages/risk-engine/tests/motor.test.ts`

## Los tipos de datos que definen el contrato

| Tipo | Qué representa | Quién lo construye |
|---|---|---|
| `Respuesta` | Una respuesta capturada, con su opción, peso y criticidad | Integrante 3 y 4, al capturar una evaluación |
| `FactorEvaluado` | Un factor de riesgo del establecimiento con su puntaje aplicado | Integrante 2, desde los datos del establecimiento |
| `OpcionFactor` | Una opción posible de un factor, con sus límites si es automático | Integrante 2, desde el catálogo |
| `RangoFrecuencia` | Un rango de la matriz de frecuencia de inspección | Integrante 2, desde el catálogo |
| `RangoCalificacion` | Un rango de calificación de la ficha | Integrante 2, desde el catálogo |
| `ReglaAprobacion` | Los umbrales de aprobación (porcentaje mínimo, máximo de NC) | Integrante 2, desde `version_ficha` |
| `ResultadoRiesgo` | El resultado completo del cálculo | Lo que el Integrante 1 devuelve desde el backend, y lo que el Integrante 3 calcula en el cliente |

## Cómo se usa desde cada rol

**Integrante 1 (backend):** importa el paquete, arma los objetos de entrada con los
datos que vienen de la base de datos (vía Integrante 2), llama a `calcularRiesgo(...)`,
y devuelve `ResultadoRiesgo` en la respuesta del endpoint de evaluación.

**Integrante 3 (frontend PWA):** importa el mismo paquete en el cliente, arma los
mismos objetos de entrada a partir de lo que el usuario va respondiendo en pantalla,
y muestra el resultado en tiempo real sin esperar al servidor. El resultado del
cliente es solo para mostrar en pantalla — el que cuenta oficialmente es el que
calcula el servidor al sincronizar.

**Integrante 4 (frontend de aplicación):** consume el `ResultadoRiesgo` que el
Integrante 3 le entrega ya calculado, para mostrarlo en la pantalla de evaluación
(porcentaje, nivel de riesgo, si aprueba o no).

## Regla que aplica a los tres

Ninguno de los tres debe reimplementar el cálculo por su cuenta ni cambiar un valor
del motor "rápido" para que algo funcione. Si un caso no calcula como se espera, el
paquete `risk-engine` es el que se corrige — porque corregirlo ahí corrige el cálculo
en el backend y en el cliente a la vez, sin que puedan desincronizarse.
