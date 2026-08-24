# Sistema PWA de Evaluación Basada en Riesgo (EBR/BPM)

Aplicación web progresiva para gestionar el ciclo completo de Evaluaciones Basadas en Riesgo de establecimientos sujetos a inspección BPM.

**Cliente:** Ministerio de Salud Pública — DIGEMAPS
**Entrega:** viernes 25 de septiembre de 2026

---

## Arranque rápido

```bash
git clone <url-del-repo> && cd ebr-bpm

# 1. Activar los hooks del equipo (una sola vez por clon)
git config core.hooksPath .githooks

# 2. Configurar tu identidad personal para los commits
git config user.name  "Tu Nombre"
git config user.email "tu.correo@ejemplo.com"

# 3. Variables de entorno
cp .env.example .env

# 4. Levantar PostgreSQL, MinIO y Mailhog
docker compose up -d

# 5. Probar el motor de riesgo
cd packages/risk-engine && npm install && npm test
```

La base de datos queda con el esquema, los catálogos y los datos reales de los tres Excel ya cargados: **90 nodos de la ficha BPM, 45 criterios evaluables, 17 categorías y 111 subcategorías de alimento, 6 factores de riesgo con sus 24 opciones.**

| Servicio | URL |
|---|---|
| PostgreSQL | `localhost:5432` |
| MinIO (consola) | http://localhost:9001 |
| Mailhog (correos) | http://localhost:8025 |

---

## Qué hace el sistema

El núcleo es una cadena de cálculo que cierra en ciclo:

```
Ficha BPM (45 criterios)
      ↓  % cumplimiento = puntos / (total − puntos N/A)
Factor 3 "Cumplimiento BPM"  ← peso 0.56 de 1.00
      ↓
RE = Σ (puntaje × peso) sobre 6 factores
      ×
RP = mayor nivel de riesgo entre las categorías que elabora
      ↓
RT = RP × RE  →  1.0–3.6 Anual · >3.6–6.3 Semestral · >6.3 Trimestral
      ↓
Se programa la próxima inspección → vuelve a alimentar la cadena
```

**El resultado de una inspección determina cuándo será la siguiente.** No es un flujo lineal.

---

## Estructura

```
ebr-bpm/
├── apps/
│   ├── api/                  Backend (ver ADR-001)
│   └── web/                  PWA React + Vite
├── packages/
│   ├── risk-engine/          Motor de riesgo — IMPLEMENTACIÓN ÚNICA
│   └── shared-types/         Tipos compartidos API ↔ PWA
├── db/
│   ├── 01_schema.sql         51 tablas, triggers, índices
│   ├── 02_seed_catalogos.sql Roles, 6 factores, frecuencias
│   ├── 03_seed_ficha_bpm.sql Generado desde el Excel
│   ├── 04_seed_matriz_...sql Generado desde el Excel
│   ├── 05_funciones.sql      Motor de riesgo en PL/pgSQL
│   └── opcional/             Pruebas y script de ajustes
├── docs/
│   ├── plan-maestro.md       Plan de las 6 semanas
│   ├── modelo-datos.md       Normalización 1NF→3NF y DDL
│   ├── hallazgos.md          Defectos de los archivos fuente
│   └── adr/                  Decisiones de arquitectura
├── .githooks/                Hooks de Git
└── docker-compose.yml
```

---

## El motor de riesgo vive en un solo lugar

`packages/risk-engine` es un paquete TypeScript que **importan tanto el API como la PWA**.

El técnico necesita ver el puntaje en tiempo real sin conexión, y el servidor es la autoridad final. Con dos implementaciones separadas —una en el cliente y otra en el backend— cualquier corrección tendría que aplicarse dos veces y tarde o temprano divergen. Con un paquete compartido, ese riesgo desaparece.

Las funciones PL/pgSQL de `db/05_funciones.sql` se conservan como **verificación independiente**: el CI corre ambas implementaciones sobre los mismos casos y compara.

### Regla no negociable

**Ningún número del dominio se escribe en el código.** Ni `0.5`, ni `0.56`, ni `3.6`, ni `60`, ni `81`. Todos vienen de la base de datos.

Si el número aparece en un Excel de la DIGEMAPS, va en una tabla.

```bash
cd packages/risk-engine
npm test          # 17 casos
npm run test:watch
```

---

## Flujo de trabajo

```
main         ← siempre desplegable, protegida, solo por PR
└── develop  ← integración
    ├── feat/EBR-045-motor-riesgo-re
    ├── fix/EBR-052-validacion-na
    └── docs/EBR-060-manual-tecnico
```

- Commits en formato [Conventional Commits](https://www.conventionalcommits.org/): `feat(motor): cálculo ponderado de RE`
- Todo PR necesita al menos una aprobación. El Tech Lead revisa lo que toque el motor de riesgo o la sincronización.
- **PR pequeños.** Más de ~400 líneas se parte: un PR de 2.000 líneas no se revisa, se aprueba a ciegas.
- Nadie hace push directo a `main` ni a `develop`.

Ver `CONTRIBUTING.md` para la Definition of Done completa.

---

## Estado de las decisiones abiertas

| # | Pendiente | Impacto | Dónde está el supuesto |
|---|---|---|---|
| **ADR-001** | Stack de backend | Alto | `docs/adr/001-stack.md` |
| **A-01** | Regla de conversión de escala 2–8 → Bajo/Medio/Alto | **Bloqueante** | Tabla `rango_nivel_riesgo`, con `es_supuesto = TRUE` |
| **A-02** | Quién asigna la criticidad C/M/Me a los 45 criterios | **Bloqueante** | Columna `item_ficha.id_criticidad`, hoy nula |
| **A-07** | ¿El permiso sanitario depende de aprobar la inspección? | Medio | `evaluarAprobacion()` en el motor |

Los supuestos están **marcados en datos o comentados en el código**, nunca escondidos en un `if`. Cuando lleguen las respuestas, corregirlos es un `UPDATE` o un cambio de una línea.

Ver `docs/hallazgos.md` para los defectos encontrados en los archivos fuente.
