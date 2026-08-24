# ADR-001 — Stack tecnologico

**Estado:** PROPUESTO — pendiente de ratificacion del equipo
**Fecha:** 2026-08-24

## Contexto

El SRS permite:

- **Backend:** .NET 9 Web API + Entity Framework Core, o NodeJS + Express
- **Frontend:** JavaScript o TypeScript + PWA + Material Design
- **Base de datos:** PostgreSQL o MySQL

El equipo no habia cerrado la decision. Quedan menos de seis semanas y el
andamiaje del repositorio depende de ella.

## Restriccion determinante

El RNF-01 exige que la PWA funcione sin conexion. Una inspeccion ocurre dentro
de una planta sin senal y dura horas.

Consecuencia: **el motor de riesgo tiene que ejecutarse en el cliente**, porque
el tecnico necesita ver el puntaje en tiempo real mientras llena la ficha. Pero
el servidor sigue siendo la autoridad final del calculo.

Eso deja dos caminos:

1. **Implementar el motor dos veces** (TypeScript en el cliente, C# en el servidor)
   y mantenerlos sincronizados con un set de pruebas compartido.
2. **Implementarlo una sola vez** en TypeScript, en un paquete que importen ambos.

El camino 1 aparece en el plan como riesgo R-04 y como la historia M-08, estimada
en 13 puntos. Ademas, cada correccion futura del motor habria que aplicarla dos
veces, y tarde o temprano divergen.

## Decision

**TypeScript en todo el stack**, en un monorepo:

| Capa | Eleccion |
|---|---|
| Backend | NestJS + Prisma |
| Base de datos | PostgreSQL 16 |
| Frontend | React 18 + Vite + TypeScript |
| UI | MUI (Material Design, exigido por el SRS) |
| PWA | Workbox + Vite PWA plugin |
| Offline | Dexie.js sobre IndexedDB |
| Motor de riesgo | `packages/risk-engine`, importado por API y PWA |

## Justificacion

**El argumento decisivo es el motor compartido.** Elimina el riesgo R-04 completo
y borra una historia de 13 puntos del backlog. En un proyecto de seis semanas eso
no es una preferencia estetica: es tiempo real recuperado.

**NestJS sobre Express** porque cinco personas escribiendo Express sin estructura
producen cinco estilos distintos. NestJS impone modulos, inyeccion de dependencias,
guards para el RBAC y pipes de validacion. Cuesta algo de curva de aprendizaje y
lo compensa en consistencia.

**PostgreSQL sobre MySQL** por las CTE recursivas, que son la forma natural de
recorrer la jerarquia auto-referenciada de la ficha, y por el soporte nativo de
JSONB para `calculo_riesgo.re_detalle`.

## Consecuencias

**A favor**

- Un solo lenguaje: los cinco integrantes pueden revisar cualquier PR
- El motor de riesgo se implementa, prueba y corrige una sola vez
- Tipos compartidos entre API y PWA sin duplicacion
- Las funciones PL/pgSQL de `db/05_funciones.sql` quedan como verificacion
  independiente: el CI corre ambas implementaciones y compara

**En contra**

- Si la mayoria del equipo tiene mas soltura en C# que en TypeScript, esta
  decision cuesta mas de lo que ahorra
- NestJS tiene curva de aprendizaje frente a Express
- Prisma es menos flexible que EF Core para consultas complejas; se compensa
  con `$queryRaw` donde haga falta

## Si el equipo prefiere .NET

Es una decision legitima y el repositorio la soporta: solo cambia `apps/api`.
Todo lo demas —`db/`, `docs/`, `.github/`, `.githooks/`, `apps/web`— se mantiene.

En ese caso hay que asumir explicitamente el costo del motor duplicado:
reactivar la historia M-08 en el backlog y agregar al CI un job que corra los
mismos casos contra ambas implementaciones y falle si difieren.

**La regla es simple: decidan por la fluidez real del equipo, no por elegancia
tecnica.** Con seis semanas, la velocidad del equipo pesa mas que el stack.

## Ratificacion

Esta decision debe confirmarse o revertirse en la primera reunion del equipo.
Una vez ratificada, no se cambia.
