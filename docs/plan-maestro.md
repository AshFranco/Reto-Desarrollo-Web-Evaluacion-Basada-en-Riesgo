# Plan de Ejecución — Sistema PWA de Evaluación Basada en Riesgo (EBR/BPM)

**Cliente:** Ministerio de Salud Pública — DIGEMAPS · DPS/DAS
**Dominio:** Inspección de Buenas Prácticas de Manufactura (BPM) en establecimientos de alimentos
**Equipo:** 5 integrantes
**Ventana:** Mar 18 ago 2026 → Vie 25 sep 2026 (**5 semanas y 6 días · 28 días hábiles**)
**Fuentes:** SRS "Reto Julio-Septiembre 2026" · Ficha de Inspección BPM (rev. oct-2024) · Matriz de Riesgo de Alimentos · Hoja de Categorización de Establecimiento y Frecuencia de Inspección · Sesión de clase del 18/08

---

## 0. Cómo usar este plan

Documento maestro del proyecto. Se versiona en `/docs/plan-maestro.md`.

**Reglas:**
- El backlog (§7) se carga a GitHub Projects **hoy**. El plan operativo vive ahí.
- **Fecha de entrega inamovible: viernes 25 de septiembre.** Todo hito interno existe para proteger esa fecha.
- Hay un entregable **antes** que todo lo demás: el modelo entidad-relación para la próxima clase (§9, Sprint 0).
- Cambios de alcance se registran en la bitácora (§17).

---

## 1. Entendimiento del reto

### 1.1 El problema real

La DIGEMAPS inspecciona establecimientos de alimentos aplicando una ficha BPM de 45 criterios. Hoy todo vive en Excel: la ficha se llena a mano en campo (o en papel y luego se transcribe), el riesgo del producto se busca en una matriz de 110 subcategorías, y la frecuencia de inspección se calcula en una tercera hoja con fórmulas encadenadas.

El sistema debe convertir ese ecosistema de hojas de cálculo en una **PWA que funcione sin conexión**, porque las inspecciones ocurren dentro de plantas de producción donde no hay señal.

### 1.2 El hallazgo que define la arquitectura

**Los tres Excel no son tres módulos. Son una sola cadena de cálculo.**

```
FICHA DE INSPECCIÓN BPM (45 ítems evaluables, jerarquía de 4 niveles)
            │
            │  % de cumplimiento = puntos / (45 − puntos_NA)
            ▼
   Factor 3 "Cumplimiento con las BPM"  ←── peso 0.56 de 1.00
            │
            ▼
   RE = Σ (puntaje_factor × peso_factor)   [6 factores, pesos suman 1.00]
            │
            │              RP = mayor nivel de riesgo entre las
            │                   categorías de alimento que elabora
            │                   (Bajo=1 · Medio=2 · Alto=3)
            ▼                            │
        ┌───────────────────────────────┘
        ▼
   RT = RP × RE
        │
        ▼
   1.0 – 3.6  → Riesgo bajo   → Inspección ANUAL
   > 3.6–6.3  → Riesgo medio  → Inspección SEMESTRAL
   > 6.3      → Riesgo alto   → Inspección TRIMESTRAL
                                        │
                                        ▼
                          Se programa la próxima inspección
                          → que vuelve a alimentar la cadena
```

El resultado de una inspección determina cuándo será la siguiente. **Es un ciclo cerrado, no un flujo lineal.** Modelar la ficha y el motor de riesgo como módulos independientes es el error de diseño que hundiría el proyecto.

Nota de peso: el factor "Cumplimiento con las BPM" vale **0.56 de 1.00** — más que los otros cinco factores sumados. La ficha de inspección no es un formulario auxiliar; es el insumo dominante del motor.

### 1.3 Los cuatro orígenes de una evaluación (RF-06)

| Escenario | Origen | Quién lo inicia |
|---|---|---|
| 1 | Solicitud de la empresa | Administrador Empresa / Usuario Delegado |
| 2 | Programación institucional (por frecuencia calculada) | Sistema / Coordinador |
| 3 | Alerta LAPCH | Coordinador |
| 4 | Reporte o denuncia | Coordinador |

El escenario 2 es el que cierra el ciclo: el sistema debe **generar automáticamente** los casos programados a partir de la frecuencia calculada en la inspección anterior.

---

## 2. Especificación del motor de riesgo

Esta sección es la fuente de verdad del cálculo. Extraída de las fórmulas reales de los Excel, no del SRS (que está desactualizado — ver §3).

### 2.1 Escala de respuesta de la ficha

| Código | Significado | Valor |
|---|---|---|
| **C** | Cumple | 1.0 |
| **CP** | Cumplimiento parcial | 0.5 |
| **IT** | Incumplimiento total | 0.0 |
| **N/A** | No aplica | **Excluido del cálculo** |

Fórmula original: `IFS(C="Si",1, CP="Si",0.5, IT="Si",0, NA="Si","N/A")`

> ⚠️ La transcripción del audio dice *"CP vale tres punto cinco"*. Es un error de transcripción. La fórmula del Excel dice **0.5**. Verificar que nadie en el equipo esté trabajando con 3.5.

### 2.2 Cálculo del porcentaje de cumplimiento

```
puntos_obtenidos = Σ valor(respuesta)  para respuestas ∈ {C, CP, IT}
puntos_NA        = Σ peso(ítem)        para respuestas = N/A
total_posible    = 45

% cumplimiento = puntos_obtenidos / (total_posible − puntos_NA)
```

**El N/A no vale cero: sale del denominador.** Si se trata como cero, se penaliza a la planta por criterios que no le aplican. La profesora insistió explícitamente en este punto: *"como si esa pregunta no existiera"*.

### 2.3 Criterios de calificación de la inspección

| Rango | Condición | Acción |
|---|---|---|
| ≤ 60% | Condiciones inaceptables | Considerar cierre |
| > 60% – 70% | Condiciones deficientes | Urge corregir |
| > 70% – 80% | Condiciones regulares | Necesario hacer correcciones |
| > 80% | Buenas condiciones | Hacer algunas correcciones |

**Regla de aprobación** (fórmula original):
```
SI  NC_Críticas > 1                  → "No aprueba, corregir NC Críticas inmediatamente"
SI  % > 60  Y  NC_Mayores ≤ 5        → "Aprueba la inspección"
EN OTRO CASO                         → "No aprueba, presentar plan de corrección de NC"
```

Clasificación de no conformidades: **C** = Crítica · **M** = Mayor · **Me** = Menor.

Regla adicional del encabezado de la ficha: **> 81% → otorgar Permiso Sanitario.**

### 2.4 Riesgo del Producto (RP)

| Nivel | Puntos |
|---|---|
| Riesgo Bajo | 1 |
| Riesgo Medio | 2 |
| Riesgo Alto | 3 |

`RP = MAX(nivel_riesgo)` sobre todas las categorías de alimento que elabora el establecimiento.

Fuente: matriz de 17 categorías y 110 subcategorías, cada una con Riesgo Microbiológico y Riesgo Químico (BAJO=2 · MEDIO=4 · ALTO=8), y `RIESGO TOTAL = PROMEDIO(micro, químico)`.

### 2.5 Riesgo del Establecimiento (RE)

`RE = Σ (puntaje_factor × peso_factor)` — los pesos suman exactamente 1.00.

| # | Factor | Peso | Opciones y puntajes |
|---|---|---|---|
| 1 | Volumen de producción | **0.16** | Grande (>2.000.000/mes)=3 · Mediano (800.000–2.000.000)=2.33 · Pequeño (200.000–800.000)=1.67 · Micro (<200.000)=1 |
| 2 | Implementación sistema HACCP | **0.09** | No tiene=3 · 25% de las líneas=2.33 · 75% de las líneas=1.67 · Todas las líneas=1 |
| 3 | **Cumplimiento con las BPM** | **0.56** | ≤60%=3 · >60%–70%=2.33 · >70%–80%=1.67 · >80%=1 |
| 4 | Proveedor INABIE | **0.05** | Nivel nacional=3 · Nivel regional=2.33 · Nivel local=1.67 · No es suplidor=1 |
| 5 | Rechazos de Registro Sanitario (microbiológicos, últimos 5 años) | **0.06** | >2 rechazos=3 · 2 rechazos=2.33 · 1 rechazo=1.67 · Ninguno=1 |
| 6 | Plan de muestreo microbiológico | **0.08** | No cuenta=3 · Solo materias primas=2.33 · Solo áreas de proceso y producto terminado=1.67 · Materias primas + proceso + producto terminado=1 |

> El factor 3 se alimenta **automáticamente** del % de cumplimiento de la última inspección. No se digita.

### 2.6 Riesgo Total y frecuencia

```
RT = RP × RE
```

| RT | Nivel de riesgo | Frecuencia de inspección |
|---|---|---|
| 1.0 – 3.6 | Riesgo bajo | Anual |
| > 3.6 – 6.3 | Riesgo medio | Semestral |
| > 6.3 | Riesgo alto | Trimestral |

**Rango teórico:** RE ∈ [1, 3] y RP ∈ [1, 3], por lo que RT ∈ [1, 9].

---

## 3. Hallazgos, defectos y ambigüedades

Documento formal de observaciones. **Enviar a la profesora esta semana** — los hallazgos 1 a 4 son defectos reales de los archivos fuente.

### 3.1 Defectos en los archivos entregados

| # | Archivo | Defecto | Impacto |
|---|---|---|---|
| **D-01** | Hoja Frecuencia Inspección | El factor 6 devuelve `FALSE` en vez de puntaje. El valor de la celda ("Plan de muestreo en materias primas") no coincide con ninguna cadena del `IF` ("Tiene plan de muestreo microbiológico solo para las materias primas"). | El ejemplo con RE=1.2067 **está mal calculado**: el factor 6 aportó 0 en vez de 0.1864. El RE real sería ≈1.393 y el RT ≈4.18, que sigue siendo Semestral pero por poco. |
| **D-02** | Matriz Riesgo Alimentos | Filas 3-5 con `#N/A` propagado. | Datos basura que romperían la importación. |
| **D-03** | Matriz Riesgo Alimentos | Tres subcategorías de Frutas y Hortalizas (purés y preparados para untar, pulpas y preparados, productos fermentados) **sin nivel de riesgo asignado**. | Un establecimiento que solo elabore esos productos no podría calcular RP. |
| **D-04** | Ficha Inspección BPM | La columna de criticidad (C/M/Me) está **vacía en los 45 ítems**, pero la regla de aprobación depende de ella (`COUNTIFS(...,"C",...)` y `COUNTIFS(...,"M",...)`). | La regla de aprobación **no se puede ejecutar**. Bloqueante. |

### 3.2 Ambigüedades a resolver con la profesora

| # | Pregunta | Por qué importa |
|---|---|---|
| **A-01** | **La matriz de alimentos produce un "riesgo total" numérico en escala 2–8 (promedio de micro y químico), pero la hoja de frecuencia consume niveles Bajo=1 / Medio=2 / Alto=3. ¿Cuál es la regla de conversión?** | **Es el eslabón faltante de toda la cadena.** Sin esta regla el motor no se puede implementar. Máxima prioridad. |
| A-02 | ¿Quién asigna la criticidad (Crítica/Mayor/Menor) a cada uno de los 45 ítems? ¿Es fija por ítem o la decide el inspector en campo? | Determina si es dato de catálogo o dato de la evaluación. |
| A-03 | El riesgo químico está vacío en 108 de 110 subcategorías. ¿Se considera opcional, o falta completarlo? | Si es opcional, `RIESGO TOTAL = PROMEDIO()` sobre un solo valor; si no, hay 108 filas incompletas. |
| A-04 | Todos los ítems valen 1 punto. ¿Habrá pesos diferenciados por ítem en el futuro? | Ella pidió poder "aumentar o reducir el valor de la pregunta" → el modelo debe soportarlo aunque hoy todos valgan 1. |
| A-05 | ¿La importación de los Excel es una carga inicial única o una función permanente del sistema? | Cambia si es un script de seed o un módulo con UI. |
| A-06 | ¿Un establecimiento con varias categorías de alimento usa el MAX o el promedio para RP? | El Excel dice "Mayor nivel de riesgo", se asume MAX. Confirmar. |

### 3.3 Discrepancias entre el SRS y los archivos reales

| SRS dice | Los Excel dicen | Resolución |
|---|---|---|
| RF-13: secciones "Instalaciones, Equipos, Personal, Higiene, Producción, Almacenamiento, Transporte, Control de Calidad" | 7 secciones reales: (1) Establecimiento-Diseño de instalaciones y equipo, (2) Capacitación y competencia, (3) Mantenimiento/limpieza/desinfección/plagas, (4) Higiene personal, (5) Control de las operaciones, (6) Información sobre productos, (7) Transporte | **Manda el Excel.** El SRS enumeró temas de memoria. |
| RF-13: respuestas "Cumple / No Cumple / No Aplica" (3 opciones) | **C / CP / IT / N/A** (4 opciones) | **Manda el Excel.** Falta "Cumplimiento parcial" en el SRS. |
| RF-14: calcula "puntaje, % de cumplimiento, nivel de riesgo" | El nivel de riesgo requiere `RT = RP × RE`, que el SRS nunca menciona | **Manda el Excel.** El SRS omite el 80% del motor. |
| RF-14: matriz de frecuencia 1.0-3.6 / >3.6-6.3 / >6.3 | Idéntico | ✅ Coincide |

**Regla del proyecto: ante conflicto, mandan los Excel.** Es la fuente operativa real y así lo confirmó la profesora en clase (*"lo que ellos digan es lo legal"*).

---

## 4. Estructura de la Ficha de Inspección BPM

45 ítems evaluables, 33 subtotales, jerarquía de hasta 4 niveles. Distribución: 7 nodos de nivel 1, 14 de nivel 2, 18 de nivel 3, 6 de nivel 4.

```
1. ESTABLECIMIENTO — DISEÑO DE LAS INSTALACIONES Y EQUIPO
   1.1 Ubicación y estructura
       1.1.1 Ubicación del establecimiento                        ✔ evaluable
       1.1.2 Diseño y disposición del establecimiento             ✔
       1.1.3 Estructuras internas y accesorios
             1.1.3.1 Paredes                                      ✔
             1.1.3.2 Pisos                                        ✔
             1.1.3.3 Techos                                       ✔
             1.1.3.4 Ventanas                                     ✔
             1.1.3.5 Puertas                                      ✔
             1.1.3.6 Superficies en contacto con los alimentos    ✔
   1.2 Instalaciones
       1.2.1 Drenaje y eliminación de residuos                    ✔
       1.2.2 Instalaciones de limpieza                            ✔
       1.2.3 Instalaciones para higiene personal y sanitarios     ✔
       1.2.4 Temperatura                                          ✔
       1.2.5 Calidad del aire y ventilación                       ✔
       1.2.6 Iluminación                                          ✔
       1.2.7 Almacenamiento                                       ✔
   1.3 Equipo                                                     ✔

2. CAPACITACIÓN Y COMPETENCIA
   2.1 Conocimiento y responsabilidades                           ✔
   2.2 Programas de capacitación                                  ✔
   2.3 Instrucción y supervisión                                  ✔

3. MANTENIMIENTO, LIMPIEZA, DESINFECCIÓN Y CONTROL DE PLAGAS
   3.1 Mantenimiento y limpieza
       3.1.1 Consideraciones generales                            ✔
       3.1.2 Métodos y procedimientos de limpieza y desinfección  ✔
       3.1.3 Monitoreo/seguimiento de la eficacia                 ✔
   3.2 Sistemas de control de plagas                              ✔

4. HIGIENE PERSONAL                                               ✔

5. CONTROL DE LAS OPERACIONES
   5.1 Descripción de los productos y procesos
       5.1.1 Descripción del producto                             ✔
       5.1.2 Descripción de fases del proceso                     ✔
       5.1.3 Monitoreo, medidas correctivas y verificación        ✔
   5.2 Aspectos fundamentales de las BPM
       5.2.1 Especificaciones microbiológicas, físicas, químicas y de alérgenos  ✔
       5.2.2 Materiales y materias primas                         ✔
       5.2.3 Envasado                                             ✔
   5.3 Agua                                                       ✔
   5.4 Procedimientos de retiro del mercado                       ✔

6. INFORMACIÓN SOBRE PRODUCTOS Y SENSIBILIZACIÓN DEL CONSUMIDOR
   6.1 Etiquetado de los productos                                ✔

7. TRANSPORTE                                                     ✔
```

**Cada ítem evaluable contiene sub-literales** (a, b, c…) que son los criterios concretos que el inspector lee. Ejemplo: `1.1.1 Ubicación del establecimiento` → *a) Ubicación adecuada · b) Alrededores limpios · c) Ausencia de focos de contaminación*. La respuesta C/CP/IT/N/A se marca **a nivel del ítem**, no del literal — los literales son texto guía. Confirmar con A-02 si esto cambia.

### 4.1 Datos de cabecera de la ficha

**Establecimiento:** nombre · calle · municipio · DPS/DAS · teléfono · correo · RNC · fecha de inicio de operaciones · No. de Permiso Sanitario · fecha de vencimiento · productos elaborados · producción anual · número de empleados (M/F) · mercado objetivo · categorías de alimento

**Datos de riesgo (alimentan RE):** ¿tiene HACCP? + nivel de implementación · ¿tiene plan de muestreo microbiológico? + dónde lo aplica · ¿es suplidor del INABIE? + cómo distribuye

**Contactos:** propietario (nombre, cédula, celular, correo) · representante (nombre, cédula, celular, correo)

**Control interno:** fecha y calificación de la última inspección · fecha y calificación de la inspección actual · oficiales de salud DPS/DAS (2) · técnicos DIGEMAPS (2)

**Cierre:** hasta 10 medidas correctivas y recomendaciones · fecha de próxima visita · firmas

---

## 5. Decisiones de arquitectura (ADR)

### ADR-01 — Stack

El SRS permite: **.NET 9 Web API + EF Core** o **NodeJS + Express**; frontend **JS/TS + PWA + Material Design**; BD **PostgreSQL o MySQL**.

**Recomendación: .NET 9 Web API + EF Core + PostgreSQL + React 18 (TypeScript) + MUI**

Diferencia clave respecto a otros proyectos: aquí **EF Core sí está permitido** (no hay exigencia de stored procedures). Eso acelera notablemente el desarrollo del CRUD y deja tiempo para lo difícil, que es el offline.

**Alternativa válida:** NodeJS + Express + Prisma + PostgreSQL. Elegirla **solo si la mayoría del equipo tiene más soltura en TypeScript que en C#** — con 28 días hábiles, la velocidad del equipo pesa más que la elegancia del stack.

**Decisión obligatoria hoy.** Se documenta en `/docs/adr/001-stack.md` y no se cambia.

### ADR-02 — Componentes

| Capa | Elección | Justificación |
|---|---|---|
| Backend | .NET 9 Web API + EF Core | Restricción SRS |
| BD | PostgreSQL 16 | Restricción SRS; mejor soporte de JSON y CTE recursivas |
| Frontend | React 18 + TypeScript + Vite | Restricción SRS |
| UI Kit | **MUI (Material UI)** | El SRS exige Material Design explícitamente |
| PWA | **Workbox** (service worker) + Vite PWA plugin | Estándar de facto; evita escribir SW a mano |
| BD local | **Dexie.js** sobre IndexedDB | Ver ADR-03 |
| Estado | TanStack Query + Zustand | Query maneja caché y reintentos; encaja con sincronización |
| Auth | JWT + refresh token, RBAC | RNF-02 |
| Archivos | MinIO (S3-compatible, Docker) | Fotos y evidencias; migrable a S3/Azure sin cambiar código |
| PDF | QuestPDF | Informe de evaluación (RF-16, RF-19) |
| Correo | MailKit + Mailhog (dev) | Integración opcional A+ |
| Jobs | Hangfire | Generación automática de casos programados |
| Contenedores | Docker Compose (api, web, postgres, minio, mailhog) | Entorno completo con un comando |
| CI | GitHub Actions | Build + test en cada PR |

### ADR-03 — Estrategia offline (el riesgo técnico principal)

El RNF-01 exige instalación en móvil/escritorio, funcionamiento sin conexión y sincronización al recuperar internet. Una inspección puede durar horas dentro de una planta sin señal, capturando fotos.

**Diseño:**

1. **Shell de la app** cacheado por el service worker (Workbox, estrategia *precache*).
2. **Datos de referencia** (catálogo de la ficha, matriz de riesgo, factores, catálogos maestros) descargados completos al iniciar sesión y guardados en IndexedDB. Son pocos MB y cambian raro.
3. **Evaluación en curso** vive **primero en IndexedDB**. La UI nunca escribe directo al servidor: escribe local, y una cola de sincronización empuja al backend cuando hay red.
4. **Fotos**: se guardan como Blob en IndexedDB, comprimidas en el cliente antes de almacenar (máx. ~1200px, JPEG 0.7). Se suben por separado cuando hay conexión, con reintentos.
5. **Cola de sincronización** (`outbox`): cada operación se registra con `id_local (UUID)`, `tipo`, `payload`, `timestamp`, `intentos`, `estado`. Se procesa en orden con backoff exponencial.
6. **Idempotencia**: todas las mutaciones llevan el UUID generado en el cliente. Reenviar la misma operación no duplica nada. **Esto es obligatorio**, no opcional.
7. **Conflictos**: una evaluación pertenece a un solo evaluador y está bloqueada tras enviarse (RF-17), así que el conflicto real es raro. Política: *last-write-wins* con detección por `version`, y si el servidor tiene una versión mayor, se marca el registro para revisión manual en vez de sobrescribir en silencio.
8. **Indicador de estado** visible siempre: `En línea` / `Sin conexión — N cambios pendientes` / `Sincronizando…`.

**El cálculo del motor de riesgo corre en el cliente y se re-verifica en el servidor.** El inspector necesita ver el puntaje en tiempo real sin conexión; el servidor es la autoridad final. La lógica se implementa dos veces (TS y C#) y **se prueba con el mismo set de casos** para garantizar que dan idéntico resultado.

### ADR-04 — El catálogo de la ficha es data, no código

Requisito explícito de la profesora: *"yo tengo que tener algo dinámico que yo pueda agregar o quitar preguntas, o aumentar o reducir el valor de la pregunta"*.

Consecuencias:
- Los 45 ítems y su jerarquía de 4 niveles se cargan en BD, no se programan.
- **Tabla auto-referenciada** con `id_padre`, no una tabla por nivel. Cuando la profesora preguntó *"¿cuál sería la solución más sencilla?"* frente a la propuesta de cuatro tablas, hacia ahí apuntaba.
- Los valores de C/CP/IT/N/A son **datos configurables**, no constantes.
- **Versionado obligatorio.** Ella lo dijo textual: *"lo que ya yo hice con la imputación anterior tiene que permanecer, tiene que tomar en cuenta la persistencia"*. Si mañana C pasa a valer 1.5, las evaluaciones ya hechas conservan su cálculo original.

**Cómo se implementa la persistencia:** cada evaluación guarda `version_ficha_id` y, además, **materializa el valor numérico aplicado en cada respuesta** (`valor_aplicado`). Así el histórico es reproducible aunque el catálogo cambie, y no hay que recalcular nada retroactivamente.

---

## 6. Modelo de datos

### 6.1 Diagrama de módulos

```
SEGURIDAD              CATÁLOGO FICHA           EVALUACIÓN
├─ Usuario             ├─ VersionFicha          ├─ Caso
├─ Rol                 ├─ ItemFicha ⟲           ├─ Evaluacion
├─ UsuarioRol          │   (id_padre)           ├─ RespuestaItem
├─ Permiso             ├─ LiteralItem           ├─ Evidencia
└─ RolPermiso          ├─ OpcionRespuesta       ├─ MedidaCorrectiva
                       └─ NivelCriticidad       ├─ CalculoRiesgo
EMPRESA                                         └─ HistorialEstado
├─ Empresa             CATÁLOGO RIESGO
├─ Establecimiento     ├─ CategoriaAlimento     ORIGEN DE CASOS
├─ Representante       ├─ SubcategoriaAlimento  ├─ SolicitudBPM
├─ EstablecimientoCat  ├─ NivelRiesgo           ├─ AlertaLAPCH
└─ DatosRiesgoEstab    ├─ FactorRiesgoEstab     ├─ Denuncia
                       ├─ OpcionFactor          └─ ProgramacionInst
SOPORTE                └─ RangoFrecuencia
├─ Notificacion
├─ Auditoria           GEOGRAFÍA                SINCRONIZACIÓN
├─ Documento           ├─ Provincia             ├─ OperacionPendiente
└─ Parametro           ├─ Municipio             └─ RegistroSync
                       └─ DPS_DAS
```

### 6.2 Tablas críticas

**`ItemFicha`** — el corazón. Auto-referenciada, resuelve los 4 niveles en una sola tabla.
```
id                  PK
version_ficha_id    FK → VersionFicha
id_padre            FK → ItemFicha  (NULL = raíz)
numeracion          VARCHAR   -- "1.1.3.2"
titulo              TEXT
orden               INT
es_evaluable        BOOL      -- true solo en los 45 ítems hoja
peso                DECIMAL   -- hoy 1.0 en todos; soporta pesos futuros (A-04)
criticidad_id       FK → NivelCriticidad NULL   -- Crítica / Mayor / Menor (A-02)
activo              BOOL
```
> Consulta del árbol con CTE recursiva (`WITH RECURSIVE`). PostgreSQL lo resuelve nativo.

**`LiteralItem`** — los sub-literales a), b), c) que son texto guía bajo cada ítem evaluable.
```
id · item_ficha_id FK · letra · texto · orden
```

**`OpcionRespuesta`** — C / CP / IT / N/A como **datos**, no como enum en código.
```
id · version_ficha_id FK · codigo ('C') · nombre ('Cumple')
valor DECIMAL (1.0) · excluye_del_calculo BOOL (true solo en N/A) · orden
```

**`VersionFicha`** — habilita la persistencia histórica.
```
id · numero_version · nombre · fecha_vigencia_desde · fecha_vigencia_hasta
estado ('Borrador'|'Publicada'|'Archivada') · total_items_evaluables · usuario_publica_id
```

**`RespuestaItem`** — materializa el valor aplicado (clave para el histórico).
```
id · evaluacion_id FK · item_ficha_id FK · opcion_respuesta_id FK
valor_aplicado DECIMAL   -- congelado al momento de responder
excluido_del_calculo BOOL
observacion TEXT · uuid_local UUID   -- idempotencia offline
fecha_captura · sincronizado BOOL
```

**`CalculoRiesgo`** — snapshot completo, auditable y reproducible.
```
id · evaluacion_id FK
puntos_obtenidos · puntos_na · total_posible · porcentaje_cumplimiento
nc_criticas · nc_mayores · nc_menores
calificacion_texto · aprueba BOOL
rp_valor · rp_categoria_determinante_id
re_valor · re_detalle JSONB       -- {factor, opcion, puntaje, peso, aporte} × 6
rt_valor · nivel_riesgo · frecuencia_inspeccion
fecha_proxima_inspeccion · fecha_calculo · version_ficha_id
```
> `re_detalle` en JSONB permite auditar **por qué** dio ese número sin reconstruir el cálculo. Cuando la profesora pregunte "¿de dónde salió ese 1.2067?", la respuesta está en una sola consulta.

**`SubcategoriaAlimento`**
```
id · categoria_id FK · nombre
riesgo_microbiologico_id FK → NivelRiesgo NULL
riesgo_quimico_id FK → NivelRiesgo NULL
riesgo_total_calculado DECIMAL
nivel_riesgo_resultante_id FK → NivelRiesgo   -- ⚠ depende de resolver A-01
```

**`FactorRiesgoEstablecimiento`** y **`OpcionFactor`** — los 6 factores y sus opciones como datos.
```
FactorRiesgoEstablecimiento: id · numero · nombre · peso DECIMAL · orden · activo
OpcionFactor:                id · factor_id FK · descripcion · puntaje DECIMAL · orden
```
> Los pesos deben sumar 1.00 — se valida con un constraint o un trigger. Si la DIGEMAPS cambia un peso mañana, es un UPDATE, no un despliegue.

**`OperacionPendiente`** — la cola de sincronización (existe en cliente y espejo en servidor para auditoría).
```
id · uuid_local UUID UNIQUE · usuario_id · tipo_operacion · entidad · payload JSONB
fecha_creacion · fecha_sincronizacion · intentos · estado · error_mensaje
```

### 6.3 Cómo se importan los Excel

La profesora fue explícita: *"el programa lo tiene que importar. Ahora, tú tienes que crear estructuras para tener los datos que tienes en el Excel."*

**Estrategia de tres pasos** (aplica a los tres archivos):

1. **Staging plano.** Se carga el Excel tal cual a una tabla temporal `stg_*`, sin normalizar, con `fila_origen` para trazar errores.
2. **Normalización.** Se extraen las entidades distintas (categorías, factores, opciones) generando IDs, y luego se resuelven las claves foráneas por nombre. Este es exactamente el paso que la profesora estaba forzando al equipo a razonar en clase: la categoría aparece repetida en 110 filas y hay que convertirla en 17 registros con `id` propio, luego enlazar cada subcategoría a su `categoria_id`.
3. **Validación y reporte.** Filas rechazadas con motivo (los defectos D-02 y D-03 se detectan aquí). El resultado es un reporte de importación, no un fallo silencioso.

**Jerarquía de la ficha:** se importa en dos pasadas — primero todos los nodos con su `numeracion`, después se resuelve `id_padre` calculándolo desde la numeración (el padre de `1.1.3.2` es `1.1.3`). Es más robusto que intentar resolverlo en una sola pasada.

---

## 7. Backlog — Épicas e historias

**P0** = sin esto no hay demo · **P1** = necesario para cumplir el SRS · **P2** = diferenciador A+

### ÉPICA 1 — Fundación (P0)

| ID | Historia | RF | Est. |
|---|---|---|---|
| F-01 | Repo, solución, Docker Compose (api + web + postgres + minio + mailhog) | — | 5 |
| F-02 | CI: build + test en cada PR | — | 3 |
| F-03 | Capas Controller → Service → Repository + manejo global de errores + Serilog | — | 5 |
| F-04 | Migraciones EF Core versionadas | — | 3 |
| F-05 | Design system con MUI: tema institucional, tipografía, componentes base | RNF | 5 |
| F-06 | Configuración PWA base: manifest, service worker, instalable | RNF-01 | 5 |

### ÉPICA 2 — Seguridad y Usuarios (P0)

| ID | Historia | RF | Est. |
|---|---|---|---|
| S-01 | Login, logout, recuperación y cambio de contraseña | RF-01 | 5 |
| S-02 | JWT + refresh token + persistencia de sesión offline | RF-01, RNF-02 | 8 |
| S-03 | RBAC: 5 roles con permisos granulares | RNF-02 | 8 |
| S-04 | Registro de Administrador de Empresa y Usuario Delegado con carta de autorización | RF-02 | 8 |
| S-05 | Flujo de validación de registro: Pendiente → Aprobado / Rechazado | RF-02 | 5 |
| S-06 | Doble factor de autenticación | RF-01 (opc.) | 8 |

### ÉPICA 3 — Catálogos y Motor de Importación (P0) ← *núcleo*

| ID | Historia | RF | Est. |
|---|---|---|---|
| C-01 | Modelo jerárquico `ItemFicha` auto-referenciado + consulta con CTE recursiva | ADR-04 | 8 |
| C-02 | Versionado de ficha: Borrador → Publicada → Archivada | ADR-04 | 8 |
| C-03 | ABM de ítems de la ficha (agregar, quitar, reordenar, editar peso) | ADR-04 | 13 |
| C-04 | ABM de opciones de respuesta con sus valores configurables | ADR-04 | 5 |
| C-05 | **Importador del Excel de la Ficha BPM** (staging → normalización → validación) | Clase | 13 |
| C-06 | **Importador de la Matriz de Riesgo de Alimentos** | Clase | 8 |
| C-07 | **Importador de Factores y Frecuencias** | Clase | 8 |
| C-08 | Reporte de importación con filas rechazadas y motivo | Clase | 5 |
| C-09 | ABM de factores de riesgo del establecimiento y sus pesos (validando suma = 1.00) | §2.5 | 8 |
| C-10 | Catálogos maestros: provincias, municipios, DPS/DAS, tipos de establecimiento | — | 5 |

### ÉPICA 4 — Empresas y Establecimientos (P0)

| ID | Historia | RF | Est. |
|---|---|---|---|
| E-01 | Registrar y editar empresa (razón social, RNC, dirección, actividad económica) | RF-03 | 8 |
| E-02 | Representantes: legal, calidad, contacto principal | RF-03 | 5 |
| E-03 | Establecimientos con datos completos de la cabecera de la ficha | RF-03, §4.1 | 8 |
| E-04 | Asignación de categorías de alimento que elabora el establecimiento | §2.4 | 5 |
| E-05 | Datos de riesgo del establecimiento: HACCP, muestreo, INABIE, volumen, rechazos | §2.5 | 8 |
| E-06 | Historial y evaluaciones previas del establecimiento | RF-03 | 5 |

### ÉPICA 5 — Origen de Casos (P0/P1)

| ID | Historia | RF | Est. |
|---|---|---|---|
| O-01 | Solicitud BPM por la empresa con adjuntos y guardado como borrador | RF-05 | 8 |
| O-02 | Gestión unificada de casos con los 4 escenarios de origen | RF-06 | 8 |
| O-03 | Registro de Alerta LAPCH → procede / no procede → generar evaluación | RF-08 | 8 |
| O-04 | Registro de Denuncia → procede / no procede / remisión | RF-09 | 8 |
| O-05 | **Programación institucional automática** desde la frecuencia calculada (job Hangfire) | RF-06, RF-07 | 13 |
| O-06 | Programar, reprogramar y cancelar evaluación | RF-07 | 8 |

### ÉPICA 6 — Asignación y Planificación (P0)

| ID | Historia | RF | Est. |
|---|---|---|---|
| A-01 | Asignar y reasignar evaluador con vista de carga por técnico | RF-10 | 8 |
| A-02 | Calendario del evaluador: vistas día / semana / mes | RF-11 | 13 |
| A-03 | Dashboard del Coordinador: pendientes, programadas, alertas, denuncias, asignaciones | RF-04 | 8 |
| A-04 | Dashboard de Empresa: nueva solicitud, mis solicitudes, evaluaciones, notificaciones | RF-04 | 5 |
| A-05 | Dashboard del Técnico: asignadas, calendario, pendientes de informe | RF-04 | 5 |

### ÉPICA 7 — Ejecución de la Evaluación (P0) ← *el módulo más grande*

| ID | Historia | RF | Est. |
|---|---|---|---|
| V-01 | Descarga de datos de referencia a IndexedDB al iniciar sesión | RNF-01 | 8 |
| V-02 | **Renderizado dinámico de la ficha jerárquica de 4 niveles** desde el catálogo | RF-13 | 13 |
| V-03 | Captura de respuesta C/CP/IT/N/A por ítem, con observaciones | RF-13 | 8 |
| V-04 | Navegación por secciones con indicador de progreso y subtotales en vivo | RF-13 | 8 |
| V-05 | Captura de información general y datos de planta | RF-12 | 8 |
| V-06 | Iniciar / guardar avance / finalizar evaluación | RF-12 | 5 |
| V-07 | **Captura de fotos con compresión en cliente y almacenamiento offline** | RF-15 | 13 |
| V-08 | Adjuntar documentos y videos cortos | RF-15 | 5 |
| V-09 | Geolocalización opcional del establecimiento | RF-15 | 5 |
| V-10 | Registro de medidas correctivas y recomendaciones (hasta 10) | §4.1 | 5 |
| V-11 | Bloqueo de la evaluación tras envío | RF-17 | 3 |

### ÉPICA 8 — Motor de Riesgo (P0) ← *el corazón*

| ID | Historia | RF | Est. |
|---|---|---|---|
| M-01 | Cálculo de puntaje y % de cumplimiento con exclusión correcta de N/A | RF-14, §2.2 | 8 |
| M-02 | Conteo de NC Críticas / Mayores / Menores y regla de aprobación | §2.3 | 8 |
| M-03 | Cálculo de RP (mayor nivel de riesgo entre categorías) | §2.4 | 8 |
| M-04 | Cálculo de RE (suma ponderada de los 6 factores) | §2.5 | 8 |
| M-05 | Alimentación automática del factor 3 desde el % de cumplimiento | §2.5 | 5 |
| M-06 | Cálculo de RT, nivel de riesgo y frecuencia de inspección | §2.6 | 5 |
| M-07 | Cálculo de la fecha de próxima inspección según frecuencia | §2.6 | 5 |
| M-08 | **Implementación gemela del motor en TS (cliente) y C# (servidor)** con set de pruebas compartido | ADR-03 | 13 |
| M-09 | Snapshot auditable del cálculo (`re_detalle` en JSONB) | §6.2 | 5 |
| M-10 | Visualización del desglose del cálculo para el usuario | P2 | 8 |

### ÉPICA 9 — PWA y Sincronización (P0) ← *el mayor riesgo técnico*

| ID | Historia | RF | Est. |
|---|---|---|---|
| P-01 | Service worker con Workbox: precache del shell, app instalable | RNF-01 | 8 |
| P-02 | Esquema de IndexedDB con Dexie: referencia, evaluaciones, outbox | RNF-01 | 8 |
| P-03 | **Cola de sincronización con reintentos y backoff exponencial** | RNF-01 | 13 |
| P-04 | Idempotencia por UUID de cliente en todas las mutaciones | ADR-03 | 8 |
| P-05 | Subida diferida de fotos con reintentos | RNF-01 | 8 |
| P-06 | Indicador de estado de conexión y contador de pendientes | RNF-01 | 5 |
| P-07 | Detección de conflictos por versión y marcado para revisión | ADR-03 | 8 |
| P-08 | Pruebas de escenarios offline (pérdida de red a mitad de evaluación) | — | 8 |

### ÉPICA 10 — Informes y Cierre (P0/P1)

| ID | Historia | RF | Est. |
|---|---|---|---|
| I-01 | Generación automática del informe: resumen ejecutivo, hallazgos, NC, recomendaciones | RF-16 | 13 |
| I-02 | Informe en PDF con fotos y desglose del cálculo | RF-16, RF-19 | 13 |
| I-03 | Revisión del Coordinador: aprobar / devolver / solicitar corrección | RF-17 | 8 |
| I-04 | Gestión de correcciones por el evaluador y reenvío | RF-18 | 8 |
| I-05 | Cierre de expediente con resultado final y fecha | RF-19 | 5 |
| I-06 | Consulta histórica con filtros por empresa, solicitud, evaluación, fecha, estado | RF-20 | 8 |

### ÉPICA 11 — Notificaciones, Auditoría y Tableros (P1/P2)

| ID | Historia | RF | Est. |
|---|---|---|---|
| N-01 | Notificaciones en plataforma | RF-04 | 5 |
| N-02 | Notificaciones por correo | §5 (A+) | 5 |
| N-03 | Bitácora de auditoría de todas las acciones sensibles | RNF-02 | 8 |
| N-04 | Tablero de control con establecimientos por nivel de riesgo y frecuencia vencida | RF-04 | 8 |
| N-05 | Alertas de inspección vencida según frecuencia calculada | RF-07 | 5 |
| N-06 | Mapa GIS de establecimientos coloreado por nivel de riesgo | §5 (A+) | 8 |

### ÉPICA 12 — Calidad y Despliegue (P1)

| ID | Historia | RF | Est. |
|---|---|---|---|
| Q-01 | Swagger / OpenAPI | — | 3 |
| Q-02 | **Pruebas unitarias del motor de riesgo, cobertura ≥ 80%** | — | 13 |
| Q-03 | Pruebas de paridad TS ↔ C# con casos idénticos | ADR-03 | 8 |
| Q-04 | Pruebas E2E de los 4 escenarios de origen (Playwright) | — | 13 |
| Q-05 | Auditoría Lighthouse PWA ≥ 90 | RNF-01 | 5 |
| Q-06 | Compatibilidad Chrome / Edge / Firefox / Safari · Android / iOS | RNF-05 | 8 |
| Q-07 | Despliegue en nube con HTTPS (obligatorio para PWA) | — | 8 |
| Q-08 | Datos de demo: 20 establecimientos, 30 evaluaciones en distintos estados | — | 5 |

---

## 8. Organización del equipo

| # | Rol | Responsabilidad primaria | Secundaria |
|---|---|---|---|
| **1** | **Tech Lead / Arquitecto** | Arquitectura, **motor de riesgo (C#)**, code review de todo | Seguridad, despliegue |
| **2** | **Backend & Datos** | Modelo de datos, EF Core, **importadores de Excel**, catálogos | Jobs, reportes |
| **3** | **Frontend Lead / PWA** | **Service worker, IndexedDB, cola de sincronización**, motor en TS | Design system |
| **4** | **Frontend Aplicación** | Ficha dinámica, captura de evidencias, dashboards, calendario | Informes, accesibilidad |
| **5** | **BA / QA / DevOps** | Análisis de Excel, casos de prueba del motor, E2E, Docker, CI/CD, documentación | Notificaciones, PDF |

> El integrante 3 tiene el trabajo de mayor riesgo del proyecto. No debe cargarse con nada más. El integrante 5 hace de Scrum Master y sostiene los entregables documentales.

### 8.1 RACI

| Decisión | R | A | C | I |
|---|---|---|---|---|
| Stack y arquitectura | 1 | 1 | Todos | — |
| Modelo de datos | 2 | 1 | 1, 5 | 3, 4 |
| Estrategia offline | 3 | 1 | 1 | Todos |
| Interpretación de reglas de cálculo | 5 | 5 | 1, 2 | 3, 4 |
| Cambios de alcance | 5 | 1 | Todos | — |
| Merge a `main` | Autor | 1 | Revisor | Todos |

---

## 9. Cronograma

**Ventana:** Mar 18 ago → Vie 25 sep · 6 sprints

**Ceremonias:** standup diario 15 min a las 8:00 PM · planning lunes 7:00 PM · demo + retro viernes 6:00 PM. **La demo es de software funcionando, no de slides.**

---

### 🟦 SPRINT 0 — Descubrimiento, Modelo de Datos y Fundación
**Mar 18 ago – Dom 23 ago**

**Objetivo:** *"El modelo de datos está listo para presentar en clase, el entorno levanta con un comando y las decisiones de arquitectura están escritas."*

⚠️ **Este sprint tiene un entregable externo con fecha: el modelo entidad-relación para la próxima clase.** Es lo primero.

| Día | Hito |
|---|---|
| **Mar 18** | Kickoff (2 h). Stack decidido (ADR-01). Repo creado. Backlog cargado. Roles asignados. **Arranca el DER.** |
| **Mié 19** | **DER completo v1**: jerarquía auto-referenciada, versionado, catálogos de riesgo, sincronización. Revisado por los 5. |
| **Jue 20** | **CLASE — se presenta el modelo de datos.** Se entregan también los hallazgos D-01 a D-04 y las preguntas A-01 a A-06. |
| **Vie 21** | **DEMO 0** + Retro. `docker compose up` en las 5 máquinas. Ajustes al DER según feedback de clase. |
| **Sáb 22 – Dom 23** | Migraciones EF Core. PWA base instalable. Design system MUI. **Mínimo 1 día de descanso.** |

**Asignación:**
- **(1)** ADRs 01-04, estructura de solución, capas, decisión de stack
- **(2)** **DER completo** — es el entregable estrella de la semana
- **(3)** Investigación de Workbox + Dexie, prueba de concepto de app instalable
- **(4)** Wireframes de las 10 pantallas clave, design system MUI
- **(5)** Docker Compose, CI, **documento de hallazgos y preguntas para la profesora**

**Criterio de salida:**
- [ ] DER presentado en clase y ajustado según feedback
- [ ] `docker compose up` levanta todo en máquina limpia
- [ ] ADR-01 a ADR-04 escritas
- [ ] Hallazgos y preguntas entregados por escrito a la profesora
- [ ] CI en verde

---

### 🟩 SPRINT 1 — Catálogos, Importadores y Seguridad
**Lun 24 ago – Dom 30 ago**

**Objetivo:** *"Los tres Excel están importados a la base de datos, la ficha se consulta jerárquicamente y el sistema autentica por rol."*

| Día | Hito |
|---|---|
| **Lun 24** | Planning. **Spike de sincronización offline — timebox 6 h** (ver §9.1). |
| **Mar 25** | `ItemFicha` con CTE recursiva funcionando. Auth + JWT + RBAC. |
| **Mié 26** | **Importador de la Ficha BPM** — los 45 ítems y 4 niveles en BD. |
| **Jue 27** | **Importadores de la Matriz de Riesgo y de Factores.** Reporte de filas rechazadas. |
| **Vie 28** | **DEMO 1** + Retro. Versionado de ficha operativo. |
| **Sáb 29 – Dom 30** | ABM de ítems y de opciones de respuesta. Catálogos maestros. |

**Asignación:**
- **(1)** RBAC, permisos granulares, **veredicto del spike offline**
- **(2)** Los tres importadores + versionado + reporte de importación
- **(3)** Spike de sincronización: service worker, IndexedDB, prueba de cola
- **(4)** Pantallas de administración de catálogos, ABM de ítems
- **(5)** Verificación ítem por ítem de la importación contra los Excel originales

**Criterio de salida:**
- [ ] Los 45 ítems, 110 subcategorías, 17 categorías y 6 factores están en BD y verificados
- [ ] Se agrega y se quita un ítem desde la UI **sin tocar código**
- [ ] Se cambia el valor de CP de 0.5 a otro número desde la UI
- [ ] Publicar una versión nueva no altera datos de versiones anteriores
- [ ] **Veredicto del spike de sincronización documentado**

---

### 🟨 SPRINT 2 — Empresas, Casos y Motor de Riesgo
**Lun 31 ago – Dom 6 sep**

**Objetivo:** *"El motor de riesgo calcula RT correctamente y los 4 escenarios de origen crean casos."*

| Día | Hito |
|---|---|
| **Lun 31** | Planning. Empresas y establecimientos con datos de riesgo. |
| **Mar 1 sep** | Cálculo de % de cumplimiento con exclusión de N/A. Conteo de NC. |
| **Mié 2** | Cálculo de RP y RE con los 6 factores ponderados. |
| **Jue 3** | **HITO: RT = RP × RE + frecuencia + fecha de próxima inspección.** |
| **Vie 4** | **DEMO 2** + Retro. Solicitud BPM, alertas LAPCH y denuncias. |
| **Sáb 5 – Dom 6** | Asignación de evaluador. Motor replicado en TypeScript. |

**Asignación:**
- **(1)** **Motor de riesgo completo en C#** + snapshot auditable
- **(2)** Empresas, establecimientos, categorías, datos de riesgo, gestión de casos
- **(3)** Motor de riesgo en TypeScript + esquema de IndexedDB
- **(4)** Formularios de solicitud, alertas LAPCH, denuncias, asignación
- **(5)** **Set de casos de prueba del motor** (mínimo 15 casos con resultado esperado calculado a mano desde el Excel)

**Criterio de salida:**
- [ ] Reproducir el ejemplo del Excel: RP=3, RE, RT, frecuencia — **con el factor 6 corregido** (D-01)
- [ ] Un ítem marcado N/A sale del denominador, verificado numéricamente
- [ ] TS y C# producen resultados idénticos en los 15 casos de prueba
- [ ] Los 4 escenarios crean casos correctamente

---

### 🟧 SPRINT 3 — Ejecución de Evaluación y Offline
**Lun 7 sep – Dom 13 sep**

**Objetivo:** *"Un técnico completa una inspección entera en modo avión, con fotos, y al recuperar red todo sincroniza."*

Este es el sprint más riesgoso del proyecto.

| Día | Hito |
|---|---|
| **Lun 7** | Planning. Ficha jerárquica renderizada dinámicamente desde el catálogo. |
| **Mar 8** | Captura de respuestas con subtotales en vivo y progreso por sección. |
| **Mié 9** | Captura de fotos con compresión y almacenamiento en IndexedDB. |
| **Jue 10** | Cola de sincronización con reintentos e idempotencia por UUID. |
| **Vie 11** | **DEMO 3** + Retro. **HITO: evaluación completa en modo avión y sincronizada.** |
| **Sáb 12 – Dom 13** | Calendario del evaluador. Dashboards de los 3 roles. Geolocalización. |

**Asignación:**
- **(1)** Endpoints idempotentes, validación de sincronización en servidor, detección de conflictos
- **(2)** Persistencia de evaluaciones y respuestas, jobs de programación automática
- **(3)** **Service worker, IndexedDB, cola de sincronización, subida diferida de fotos**
- **(4)** Ficha dinámica, captura de respuestas, medidas correctivas, calendario, dashboards
- **(5)** **Pruebas de escenarios offline**: red caída a mitad, batería agotada, cierre del navegador, reconexión parcial

**Criterio de salida:**
- [ ] Inspección completa de 45 ítems + 10 fotos en modo avión, sin pérdida de datos
- [ ] Al recuperar red, todo sube en orden y sin duplicados
- [ ] Reenviar la misma operación dos veces no duplica nada
- [ ] Cerrar el navegador a mitad de evaluación y reabrir conserva el avance

---

### 🟥 SPRINT 4 — Informes, Revisión y Cierre del Ciclo
**Lun 14 sep – Dom 20 sep**

**Objetivo:** *"El ciclo cierra completo: informe generado, revisado por el Coordinador, expediente cerrado y próxima inspección programada automáticamente."*

| Día | Hito |
|---|---|
| **Lun 14** | Planning. **CONGELAMIENTO DE ALCANCE — no entran features nuevos.** |
| **Mar 15** | Generación automática del informe con hallazgos y recomendaciones. |
| **Mié 16** | Informe en PDF con fotos y desglose del cálculo de riesgo. |
| **Jue 17** | Revisión del Coordinador, ciclo de corrección, cierre de expediente. |
| **Vie 18** | **DEMO 4** + Retro. **HITO: programación automática de la próxima inspección — el ciclo cierra.** |
| **Sáb 19 – Dom 20** | Consulta histórica, auditoría, tablero de control, notificaciones. |

**Asignación:**
- **(1)** Job de programación automática, cierre de expediente, revisión de deuda técnica
- **(2)** Consulta histórica, auditoría, tablero de control
- **(3)** Sincronización del ciclo de corrección, pulido de PWA, Lighthouse
- **(4)** Pantallas de revisión del Coordinador, corrección, cierre
- **(5)** Plantilla PDF del informe, notificaciones, datos de demo

**Criterio de salida:**
- [ ] Informe en PDF completo con fotos y desglose auditable del cálculo
- [ ] Ciclo aprobar / devolver / corregir / reenviar funcionando
- [ ] Al cerrar un expediente se crea automáticamente el caso programado siguiente
- [ ] Lighthouse PWA ≥ 90

---

### ⬛ SPRINT 5 — Estabilización y Entrega
**Lun 21 sep – Vie 25 sep**

**Regla dura: ningún feature nuevo.** Solo bugs, pruebas, documentación y despliegue.

| Día | Hito |
|---|---|
| **Lun 21** | **Bug bash de 3 h.** Cada quien prueba el módulo que NO construyó. Triaje al final del día. |
| **Mar 22** | Corrección de críticos y mayores. Despliegue a staging con HTTPS. |
| **Mié 23** | E2E en staging. Pruebas en dispositivos reales (Android + iOS). Documentación técnica. |
| **Jue 24** | **Ensayo general cronometrado, 2 rondas.** Manuales por rol. Video demo grabado. |
| **Vie 25** | **ENTREGA + PRESENTACIÓN.** |

**Criterio de salida:**
- [ ] Cero bugs críticos, cero mayores abiertos
- [ ] PWA instalable desde URL pública en Android e iOS
- [ ] Los entregables de §12 completos
- [ ] Demo ensayada dos veces dentro del tiempo asignado

---

### 9.1 Spike de sincronización offline — Lun 24 ago

Timebox **6 horas**. Responsable: integrante 3.

**Objetivo:** app instalable que guarde un formulario en IndexedDB sin conexión, lo encole, y lo suba al backend al recuperar red — con una foto incluida.

**Decisión binaria al cerrar las 6 horas:**
- ✅ **Funciona** → arquitectura offline completa según ADR-03
- ❌ **No funciona** → Plan B: PWA instalable con **caché de solo lectura** (el técnico puede consultar sus asignaciones y la ficha sin conexión, pero la captura requiere red). Se documenta la limitación y la ruta de migración. Cumple RNF-01 parcialmente y salva el proyecto.

Adelantar este spike a la Semana 2 es deliberado: es la única incertidumbre capaz de hundir el cronograma.

### 9.2 Hitos de control

| Fecha | Hito | Si no se cumple |
|---|---|---|
| **Jue 20 ago** | DER presentado en clase | Bloqueante académico. Máxima prioridad de la semana. |
| **Lun 24 ago** | Veredicto del spike offline | Activar Plan B de R-01 automáticamente. |
| **Vie 28 ago** | Excel importados y verificados | Cargar por seeds SQL manuales y posponer el importador con UI a P2. |
| **Jue 3 sep** | Motor de riesgo calculando RT | Riesgo crítico de viabilidad — es el corazón del sistema. Reasignar al Tech Lead a tiempo completo. |
| **Vie 11 sep** | Evaluación completa offline y sincronizada | Activar Plan B: captura solo en línea. |
| **Vie 18 sep** | Ciclo cerrado con programación automática | Entregar con programación manual; documentar la automática como diseñada. |
| **Lun 21 sep** | Cero features pendientes | Cancelar los P2 no terminados sin discusión. |

---

## 10. Proceso de ingeniería

### 10.1 Git

```
main              ← siempre desplegable, protegida, solo por PR
└── develop       ← integración
    ├── feat/EBR-045-motor-riesgo-re
    ├── fix/EBR-052-na-denominador
    └── docs/EBR-060-manual-tecnico
```

- **Conventional Commits:** `feat(motor): cálculo ponderado de RE`
- **PR con mínimo 1 aprobación.** El Tech Lead revisa todo lo que toque el motor de riesgo o la sincronización.
- **PR pequeños.** Más de ~400 líneas se parte. Un PR de 2.000 líneas no se revisa, se aprueba a ciegas.
- **Nadie hace push directo a `main` ni `develop`.** Incluido el Tech Lead.

### 10.2 Definition of Ready
- [ ] Criterios de aceptación escritos y verificables
- [ ] Dependencias desbloqueadas
- [ ] Wireframe disponible si toca UI
- [ ] Estimada por el equipo
- [ ] Trazable a un RF del SRS o a una regla documentada en §2

### 10.3 Definition of Done
- [ ] En `develop` vía PR aprobado
- [ ] Criterios verificados por alguien distinto al autor
- [ ] **Si toca el motor de riesgo: pruebas unitarias con casos calculados a mano**
- [ ] **Si toca datos: funciona sin conexión y sincroniza**
- [ ] Sin valores del motor hardcodeados — todo desde catálogo
- [ ] Sin `console.log`, `TODO` ni credenciales en el código
- [ ] Endpoints en Swagger
- [ ] Funciona en móvil (360px) y escritorio
- [ ] CI en verde

### 10.4 Estándares no negociables
1. **Ningún valor del motor de riesgo vive en código.** Ni 0.5, ni 0.56, ni 3.6. Todo sale de la BD.
2. **Toda mutación lleva UUID de cliente.** Sin excepción — es la base de la idempotencia.
3. **El servidor recalcula siempre.** El cálculo del cliente es para la UI; la autoridad es el backend.
4. **Toda acción sensible se audita.**
5. **Nombres en español para el dominio** (`Evaluacion`, `ItemFicha`, `RiesgoTotal`), inglés para lo técnico (`Repository`, `Service`).

---

## 11. Estrategia de pruebas

| Nivel | Qué | Herramienta | Resp. |
|---|---|---|---|
| Unitarias | **Motor de riesgo (≥80% cobertura)**, cálculo de fechas | xUnit / Vitest | 1, 3 |
| Paridad | TS vs C# sobre el mismo set de casos | Fixture JSON compartido | 5 |
| Integración | Importadores de Excel, repositorios EF | xUnit + Testcontainers | 2 |
| API | Contratos, autorización por rol, idempotencia | Postman/Newman en CI | 5 |
| E2E | Los 4 escenarios de origen, ciclo completo | Playwright | 5 |
| Offline | Escenarios de pérdida de red | Manual + DevTools throttling | 3, 5 |
| PWA | Instalabilidad, service worker, caché | Lighthouse | 3 |
| Compatibilidad | Chrome/Edge/Firefox/Safari · Android/iOS | Dispositivos reales | 5 |

### 11.1 Casos de prueba obligatorios del motor

1. Todos los ítems en **C** → 45/45 = 100% → RE factor 3 = 1
2. Todos en **IT** → 0% → considerar cierre → no aprueba
3. Todos en **CP** → 22.5/45 = 50% → condiciones inaceptables
4. **10 ítems en N/A** → denominador 35, no 45. Verificar numéricamente.
5. **Todos los ítems en N/A** → división por cero. Debe manejarse sin romper.
6. 2 NC Críticas → no aprueba **aunque el porcentaje sea 95%**
7. 6 NC Mayores con 85% → no aprueba (regla `NC_Mayores ≤ 5`)
8. 61% con 0 críticas y 3 mayores → aprueba (límite inferior)
9. Exactamente 60% → **no** aprueba (la regla es `> 60`, no `≥`)
10. RT exactamente 3.6 → Anual (el rango bajo incluye 3.6)
11. RT exactamente 3.61 → Semestral
12. RT exactamente 6.3 → Semestral (el rango medio incluye 6.3)
13. Establecimiento con 3 categorías (Bajo, Medio, Alto) → RP = 3
14. **Reproducción del ejemplo del Excel** con el factor 6 corregido
15. Cambiar el valor de CP en el catálogo → las evaluaciones históricas **no cambian**

> El caso 15 es el que demuestra la persistencia que exigió la profesora. Es el más importante de todos.

---

## 12. Entregables

### Producto
1. **PWA desplegada** en URL pública con HTTPS, instalable en móvil y escritorio
2. **Repositorio** con historial limpio y README de arranque en < 10 minutos
3. **Usuarios de demo** de los 5 roles con credenciales documentadas
4. **Datos de demo**: 20 establecimientos, 30 evaluaciones en distintos estados y niveles de riesgo

### Documentación técnica
5. **Modelo entidad-relación** completo + diccionario de datos
6. **Documento de arquitectura** (modelo C4: contexto, contenedores, componentes)
7. **Especificación del motor de riesgo** — §2 de este documento, como anexo independiente
8. **Documento de estrategia offline** con diagrama de sincronización
9. **ADRs** con su justificación
10. **Swagger/OpenAPI** publicado
11. **Manual de despliegue**
12. **Matriz de trazabilidad** RF → historia → prueba → evidencia

### Documentación funcional
13. **Manual de usuario por rol** (5 documentos con capturas)
14. **Manual del administrador de catálogos** — cómo agregar preguntas y cambiar valores sin programar
15. **Guía de importación de Excel**

### Gestión y análisis
16. **Plan maestro** (este documento, actualizado)
17. **Documento de hallazgos y defectos** (§3) — entregado a la profesora
18. **Plan y reporte de pruebas** con resultados
19. **Registro de riesgos** con estado final
20. **Video demo** de 8-10 min (respaldo por si falla la demo en vivo)
21. **Presentación** de 15-20 slides

---

## 13. Riesgos

| # | Riesgo | Prob. | Impacto | Mitigación | Plan B |
|---|---|---|---|---|---|
| **R-01** | **La sincronización offline consume más tiempo del previsto** | Alta | Muy alto | Spike con timebox de 6 h el Lun 24 ago; integrante 3 dedicado exclusivamente | PWA con caché de solo lectura: consulta offline, captura en línea. Se documenta la limitación. |
| **R-02** | **A-01 sin respuesta: falta la regla de conversión escala 2-8 → Bajo/Medio/Alto** | Alta | Muy alto | Preguntar en la clase del jueves 20 | Adoptar supuesto documentado (2-2.9=Bajo · 3-5.9=Medio · ≥6=Alto), implementarlo **como parámetro configurable** y seguir. Nunca bloquearse esperando. |
| **R-03** | **Falta la criticidad C/M/Me de los 45 ítems (D-04)** | Alta | Alto | Preguntar en clase | Cargar todos como "Mayor" por defecto y dejar la asignación en el ABM de catálogo. La regla de aprobación queda funcional. |
| **R-04** | Motor de riesgo implementado dos veces se desincroniza | Media | Alto | Set de casos compartido en JSON, corrido en ambos lados en CI | Cliente solo estima y muestra "cálculo preliminar"; el definitivo lo da el servidor |
| **R-05** | 28 días hábiles para 12 épicas | Alta | Alto | Priorización P0/P1/P2 estricta. Congelamiento el 14 sep. Hitos de §9.2 | Entregar escenarios 1 y 2 completos; alertas LAPCH y denuncias como registro simple sin flujo completo |
| **R-06** | Safari/iOS limita PWA (almacenamiento, notificaciones) | Media | Medio | Probar en iOS real desde el Sprint 1, no al final | Documentar limitaciones por plataforma; garantizar Chrome/Android como plataforma primaria |
| **R-07** | Fotos saturan el almacenamiento del navegador | Media | Medio | Compresión en cliente antes de guardar; límite de fotos por ítem | Advertencia al usuario y subida forzada al recuperar red |
| **R-08** | Integrantes con carga académica desigual | Media | Medio | Standup diario detecta bloqueos en 24 h | Redistribución en el planning del lunes |
| **R-09** | Deuda técnica revienta al final | Media | Alto | Code review obligatorio, DoD estricta | Sprint 5 completo reservado para estabilización |
| **R-10** | Falla la demo el día de entrega | Baja | Muy alto | Ensayo cronometrado el jue 24. Sin dependencia de wifi institucional | **Video pregrabado + ambiente local en la laptop del presentador** |
| **R-11** | Alguien se enferma en las últimas dos semanas | Media | Alto | Nadie es dueño único de un módulo; review cruzado difunde conocimiento | Redistribución inmediata; el Tech Lead absorbe lo crítico |

---

## 14. Criterios de éxito

### Mínimo aceptable
- Los 5 roles con RBAC funcional
- Ficha de 45 ítems, 4 niveles, renderizada desde catálogo administrable
- Motor de riesgo completo: % cumplimiento con N/A excluido, RP, RE ponderado, RT, frecuencia
- Los 4 escenarios de origen de casos
- PWA instalable con captura offline y sincronización
- Informe en PDF y cierre de expediente
- Los tres Excel importados a estructuras normalizadas

### Nivel A+
1. **Ciclo cerrado**: la evaluación programa automáticamente la siguiente inspección
2. **Catálogo totalmente administrable** — se demuestra en vivo agregando una pregunta y cambiando el valor de CP
3. **Persistencia histórica demostrada** — se cambia un valor y las evaluaciones anteriores no se alteran
4. **Desglose auditable del cálculo** visible al usuario: de dónde salió cada décima del RT
5. **Offline real** demostrado en modo avión durante la presentación
6. **Mapa GIS** de establecimientos por nivel de riesgo (integración opcional del SRS)
7. **Notificaciones por correo** (integración opcional del SRS)
8. **Documento de hallazgos** con los 4 defectos encontrados en los archivos fuente

> El punto 8 cuesta dos horas y demuestra que el equipo analizó de verdad los Excel en lugar de solo transcribirlos. Es exactamente el ejercicio que la profesora planteó en clase.

---

## 15. Checklist de arranque — primeras 48 horas

**Martes 18, kickoff (2 h):**
- [ ] Lectura conjunta de este plan
- [ ] **Stack decidido y escrito** (ADR-01)
- [ ] Roles asignados y aceptados
- [ ] Horas/semana comprometidas por persona
- [ ] Horario de standup fijado
- [ ] Canal de comunicación + regla de respuesta < 4 h
- [ ] Repo creado, todos con acceso
- [ ] GitHub Projects con las 12 épicas cargadas
- [ ] **Arranca el DER — es lo del jueves**

**Miércoles 19:**
- [ ] `docker compose up` en las 5 máquinas (bloqueante)
- [ ] **DER v1 completo y revisado por los 5**
- [ ] Documento de hallazgos y preguntas redactado
- [ ] Wireframes de las 10 pantallas principales

**Jueves 20 — clase:**
- [ ] Presentar el DER
- [ ] Entregar hallazgos D-01 a D-04
- [ ] **Preguntar A-01 (la regla de conversión de escalas) — es la más importante**
- [ ] Confirmar A-02 (criticidad de los ítems)

---

## 16. Preguntas para la profesora — priorizadas

**Bloqueantes (sin esto el motor no se puede terminar):**
1. La matriz de alimentos da un riesgo total numérico de 2 a 8, pero la hoja de frecuencia consume Bajo=1/Medio=2/Alto=3. ¿Cuál es la regla de conversión?
2. ¿Quién asigna la criticidad Crítica/Mayor/Menor a los 45 ítems? La columna está vacía y la regla de aprobación depende de ella.

**Importantes:**
3. El factor 6 de la hoja de frecuencia devuelve `FALSE` por desajuste de textos. ¿Confirmamos que es un error del archivo?
4. Tres subcategorías de Frutas y Hortalizas no tienen nivel de riesgo. ¿Se completan o se excluyen?
5. El riesgo químico está vacío en 108 de 110 subcategorías. ¿Es opcional?
6. ¿La respuesta C/CP/IT/N/A se marca a nivel de ítem o de cada literal a), b), c)?

**De alcance:**
7. ¿La importación de Excel es carga inicial o función permanente del sistema?
8. El SRS menciona secciones y opciones de respuesta distintas a las del Excel. ¿Confirmamos que manda el Excel?
9. ¿El script con la estructura de preguntas que menciona el SRS se entregará, o el Excel es la fuente definitiva?

---

## 17. Bitácora de cambios

| Fecha | Versión | Cambio | Autor |
|---|---|---|---|
| 18/08/2026 | 1.0 | Versión inicial. Reemplaza el plan del proyecto de Sustancias Controladas, descartado por cambio de reto. | — |
