# 03 - Test Cases (Matriz Detallada de Casos de Prueba)
**Sistema PWA de Evaluación Basada en Riesgo (EBR/BPM)**  
**Cliente:** Ministerio de Salud Pública — DIGEMAPS  
**Total de Casos Documentados:** 18 Casos Clave de Aceptación  

---

## 1. Módulo: Motor de Riesgo (`@ebr/risk-engine`)

### TC-ENG-01: Exclusión estricta de ítems N/A del denominador
- **Módulo:** Motor de Riesgo / Cumplimiento Ficha BPM
- **Precondiciones:** Ficha BPM de 45 preguntas evaluables configurada.
- **Datos de Entrada:**
  - 35 ítems con respuesta `C` (Cumple, valor 1.0).
  - 10 ítems con respuesta `N/A` (No Aplica, excluido).
  - 0 ítems con Incumplimiento.
- **Pasos de Ejecución:**
  1. Invocar función `calcularCumplimiento(respuestas)`.
  2. Verificar puntos obtenidos, puntos excluidos por N/A y denominador efectivo.
- **Resultado Esperado:**
  - `puntosObtenidos`: 35
  - `puntosExcluidosNa`: 10
  - `denominadorEfectivo`: $45 - 10 = 35$
  - `porcentajeCumplimiento`: $35 / 35 = 100\%$ (y **no** $35/45 = 77.77\%$).
- **Resultado Actual:** `porcentajeCumplimiento = 100%`, `denominadorEfectivo = 35`.
- **Estado:** ✅ PASS

---

### TC-ENG-02: Borde exacto de frecuencia Anual vs Semestral (3.60 vs 3.61)
- **Módulo:** Motor de Riesgo / Frecuencia
- **Precondiciones:** Rangos de frecuencia de matriz v1-2026 cargados.
- **Datos de Entrada:**
  - Caso A: $RP = 1$, $RE = 3.60 \rightarrow RT = 3.60$.
  - Caso B: $RP = 1$, $RE = 3.61 \rightarrow RT = 3.61$.
- **Pasos de Ejecución:**
  1. Ejecutar cálculo con $RT = 3.6000$.
  2. Ejecutar cálculo con $RT = 3.6100$.
- **Resultado Esperado:**
  - Caso A ($RT = 3.60$): Nivel `BAJO`, Frecuencia `ANUAL` (12 meses).
  - Caso B ($RT = 3.61$): Nivel `MEDIO`, Frecuencia `SEMESTRAL` (6 meses).
- **Resultado Actual:** Asignación exacta sin errores de redondeo.
- **Estado:** ✅ PASS

---

### TC-ENG-03: Borde exacto de frecuencia Semestral vs Trimestral (6.30 vs 6.31)
- **Módulo:** Motor de Riesgo / Frecuencia
- **Precondiciones:** Rangos de frecuencia cargados.
- **Datos de Entrada:**
  - Caso A: $RP = 3$, $RE = 2.10 \rightarrow RT = 6.30$.
  - Caso B: $RP = 3$, $RE = 2.1034 \rightarrow RT = 6.3102$.
- **Pasos de Ejecución:**
  1. Evaluar asignación de rango en límite de 6.30.
  2. Evaluar asignación de rango en límite superior $> 6.30$.
- **Resultado Esperado:**
  - Caso A ($RT = 6.30$): Frecuencia `SEMESTRAL` (6 meses).
  - Caso B ($RT > 6.30$): Nivel `ALTO`, Frecuencia `TRIMESTRAL` (3 meses).
- **Resultado Actual:** Coincide con la fórmula oficial del Excel.
- **Estado:** ✅ PASS

---

### TC-ENG-04: Regla de No Aprobación por No Conformidades Críticas (> 1)
- **Módulo:** Motor de Riesgo / Regla de Aprobación
- **Precondiciones:** Evaluación con porcentaje de cumplimiento alto ($> 60\%$).
- **Datos de Entrada:**
  - % Cumplimiento: $88\%$.
  - No Conformidades Críticas (`C`): 2.
  - No Conformidades Mayores (`M`): 0.
- **Pasos de Ejecución:**
  1. Evaluar resultado final de la inspección con `evaluarAprobacion()`.
- **Resultado Esperado:**
  - `aprueba`: `false`.
  - `calificacionTexto`: "No aprueba, corregir NC Críticas inmediatamente".
- **Resultado Actual:** Rechazo mandatorio debido a `NC_Criticas > 1`.
- **Estado:** ✅ PASS

---

### TC-ENG-05: Otorgamiento de Permiso Sanitario (> 81%)
- **Módulo:** Motor de Riesgo / Aprobación Sanitaria
- **Precondiciones:** Criterios evaluados sin NC Críticas bloqueantes.
- **Datos de Entrada:** % Cumplimiento $= 85\%$.
- **Pasos de Ejecución:**
  1. Procesar cálculo de evaluación.
- **Resultado Esperado:**
  - `aprueba`: `true`.
  - `otorgaPermisoSanitario`: `true`.
- **Resultado Actual:** `otorgaPermisoSanitario: true`.
- **Estado:** ✅ PASS

---

### TC-ENG-06: Reproducción del Caso Real del Excel con corrección D-01
- **Módulo:** Motor de Riesgo / Verificación Cruzada
- **Precondiciones:** Factores del ejemplo original de DIGEMAPS.
- **Datos de Entrada:**
  - Factor 1: 0.16 (puntaje 1).
  - Factor 2: 0.09 (puntaje 1).
  - Factor 3: 0.56 (puntaje 1, % cumplimiento 85%).
  - Factor 4: 0.05 (puntaje 2.33).
  - Factor 5: 0.06 (puntaje 1).
  - Factor 6: 0.08 (puntaje 2.33 - corregido defecto D-01 donde Excel devolvía FALSE).
  - $RP = 3$ (Categoría cárnica/láctea de alto riesgo).
- **Pasos de Ejecución:**
  1. Ejecutar cálculo con factores ponderados corregidos.
- **Resultado Esperado:**
  - $RE = 1.3931$
  - $RT = 3 \times 1.3931 = 4.1793$
  - Frecuencia: `SEMESTRAL`
- **Resultado Actual:** $RE = 1.3931$, $RT = 4.1793$, Semestral.
- **Estado:** ✅ PASS

---

## 2. Módulo: PWA y Funcionamiento Offline (`apps/web`)

### TC-PWA-01: Captura de evaluación en Modo Avión e integridad en IndexedDB
- **Módulo:** PWA / Offline Storage
- **Precondiciones:** Técnico autenticado, catálogo de ficha precargado en Dexie.
- **Pasos de Ejecución:**
  1. Activar modo offline en navegador (DevTools Network -> Offline o desconectar red).
  2. Abrir evaluación asignada.
  3. Completar 15 respuestas con observaciones.
  4. Cerrar el navegador y volver a abrir la URL `http://localhost:5173/`.
- **Resultado Esperado:**
  - La aplicación abre sin pantalla de error de red (servida por Service Worker).
  - Las 15 respuestas persisten en IndexedDB en la tabla local `respuestas`.
  - El chip de estado muestra `Sin conexión — 15 pendientes`.
- **Resultado Actual:** Datos preservados íntegramente en Dexie.
- **Estado:** ✅ PASS

---

### TC-PWA-02: Sincronización diferida e idempotencia por UUID
- **Módulo:** PWA / Sincronización Outbox
- **Precondiciones:** Respuestas capturadas offline en cola de sincronización con `uuid_local`.
- **Pasos de Ejecución:**
  1. Restablecer la conexión a internet.
  2. Disparar el procesador de cola (`processor.ts`).
  3. Simular interrupción de red a mitad de sincronización y reintento con backoff exponencial.
- **Resultado Esperado:**
  - Las respuestas se envían al backend.
  - Los registros en base de datos usan `uuid_local` garantizando que no haya duplicación de respuestas si la petición se reintenta.
  - La cola outbox se vacía al completar.
- **Resultado Actual:** Sincronización limpia con idempotencia demostrada.
- **Estado:** ✅ PASS

---

### TC-PWA-03: Compresión local de evidencias fotográficas en el cliente
- **Módulo:** PWA / Multimedia
- **Precondiciones:** Dispositivo móvil o navegador con cámara/selector de fotos.
- **Datos de Entrada:** Imagen JPEG original de 8 MB ($4000 \times 3000$ px).
- **Pasos de Ejecución:**
  1. Seleccionar la foto como evidencia de un ítem con hallazgo.
  2. Pasar por `compressor.ts`.
- **Resultado Esperado:**
  - Imagen redimensionada a un ancho máximo de $\sim 1200$ px con calidad 0.7.
  - Peso final $< 500$ KB.
  - Formato persistido como `Blob` en IndexedDB para subida posterior.
- **Resultado Actual:** Compresión efectiva a $\sim 280$ KB sin pérdida de legibilidad.
- **Estado:** ✅ PASS

---

## 3. Módulo: Backend API y Seguridad (`apps/api`)

### TC-API-01: Autenticación, Throttling y Bloqueo de Cuenta por Fuerza Bruta
- **Módulo:** Auth / Throttling
- **Precondiciones:** Usuario existente en base de datos.
- **Pasos de Ejecución:**
  1. Enviar 5 intentos consecutivos de login con contraseña incorrecta.
  2. Enviar un 6to intento con la contraseña correcta.
- **Resultado Esperado:**
  - Tras el 5to intento fallido, el campo `bloqueado_hasta` se establece a 15 minutos en el futuro.
  - El 6to intento es rechazado con `401 Unauthorized` ("Cuenta temporalmente bloqueada...").
- **Resultado Actual:** Bloqueo automático ejecutado por `LoginThrottleService`.
- **Estado:** ✅ PASS

---

### TC-API-02: Rotación de Refresh Token y Revocación en Cascada ante Reuso
- **Módulo:** Auth / Token Security
- **Precondiciones:** Sesión activa con Refresh Token válido emitido.
- **Pasos de Ejecución:**
  1. Rotar token legítimamente con `POST /api/v1/auth/refresh` (se genera Token B y se revoca Token A).
  2. Simular un atacante que intenta usar el Token A (ya revocado).
- **Resultado Esperado:**
  - La petición con el token viejo es rechazada.
  - Detección de reuso: se ejecuta `revokeAllForUser()` invalidando Token B y **todas** las sesiones activas del usuario por sospecha de compromiso.
- **Resultado Actual:** Revocación en cascada ejecutada con éxito.
- **Estado:** ✅ PASS

---

### TC-API-03: Aislamiento Multi-Empresa con EmpresaOwnershipGuard (Prevención IDOR)
- **Módulo:** Seguridad / Multi-Tenancy
- **Precondiciones:** Usuario con rol `ADMINISTRADOR_EMPRESA` perteneciente a Empresa ID `10`.
- **Pasos de Ejecución:**
  1. Intentar consultar solicitud `GET /api/v1/solicitudes-bpm/99` (perteneciente a Empresa ID `20`).
  2. Intentar consultar caso `GET /api/v1/casos/88` (perteneciente a Empresa ID `20`).
- **Resultado Esperado:**
  - El backend intercepta la solicitud en el guard antes de consultar datos.
  - Retorna `403 Forbidden` ("No tiene acceso a este recurso").
- **Resultado Actual:** Bloqueo estricto a nivel de middleware.
- **Estado:** ✅ PASS

---

### TC-API-04: Bloqueo Legal de Evaluación Post-Envío (RF-17)
- **Módulo:** Evaluaciones / Integridad Legal
- **Precondiciones:** Evaluación con los 45 ítems respondidos y finalizada (`bloqueada = true`).
- **Pasos de Ejecución:**
  1. Enviar petición `POST /api/v1/evaluaciones/:id/respuestas` para intentar cambiar una respuesta de `IT` a `C`.
  2. Enviar petición `POST /api/v1/evidencias` para adjuntar una nueva foto.
- **Resultado Esperado:**
  - Ambas peticiones son rechazadas con `403 Forbidden` ("Esta evaluación ya fue enviada y sus datos están bloqueados").
- **Resultado Actual:** Modificaciones rechazadas; integridad del acta asegurada.
- **Estado:** ✅ PASS

---

### TC-API-05: Búsqueda Histórica con Scoping Forzado en Servidor
- **Módulo:** Casos / Consulta Histórica
- **Precondiciones:** Múltiples casos de diferentes empresas en base de datos.
- **Pasos de Ejecución:**
  1. Usuario de Empresa ID `10` ejecuta búsqueda enviando parámetro fraudulento `?empresaId=20`.
- **Resultado Esperado:**
  - El servicio ignora el parámetro de la URL y sobreescribe con el ID de empresa extraído del token JWT validado criptográficamente.
  - Solo se devuelven casos de la Empresa ID `10`.
- **Resultado Actual:** Scoping forzado server-side sin fugas de datos.
- **Estado:** ✅ PASS

---

## 4. Módulo: Compatibilidad Multiplataforma y Móvil (RNF-05)

### TC-RNF05-01: Compatibilidad Multi-Navegador de Escritorio (Chrome, Edge, Firefox, Safari)
- **Módulo:** RNF-05 / Navegadores de Escritorio
- **Precondiciones:** Build de producción generado (`dist/`), servidor sirviendo manifest y service worker.
- **Navegadores Evaluados:**
  - Google Chrome 128+ (Windows 11)
  - Microsoft Edge 128+ (Windows 11)
  - Mozilla Firefox 130+ (Windows 11)
  - Apple Safari 17+ (macOS Sonoma)
- **Pasos de Ejecución:**
  1. Acceder a la URL de producción desde cada navegador.
  2. Verificar registro del Service Worker (`navigator.serviceWorker.ready`).
  3. Verificar disponibilidad de instalación PWA (Chrome/Edge vía barra de direcciones, Safari vía "Agregar al Dock").
  4. Interrumpir la conexión a internet y recargar la página.
- **Resultado Esperado:**
  - Service Worker registrado sin errores de sintaxis o CSP.
  - El app shell carga instantáneamente desde el precache de Workbox sin error de conexión.
  - IndexedDB inicializa y persiste las estructuras de datos en todos los navegadores.
- **Resultado Actual:**
  - Chrome / Edge: Registro exitoso, instalación nativa disponible (`display: standalone`).
  - Firefox: Service Worker y CacheStorage operativos; precaching funcional (sin botón nativo por política de Mozilla).
  - Safari: CacheStorage e IndexedDB operativos; carga limpia.
- **Estado:** ✅ PASS

---

### TC-RNF05-02: PWA Móvil en Android (Chrome) — Instalación A2HS, GPS y Cámara
- **Módulo:** RNF-05 / Dispositivos Móviles Android
- **Precondiciones:** Dispositivo móvil Android 13/14 conectado a red local, Chrome 128+.
- **Pasos de Ejecución:**
  1. Abrir la aplicación y verificar banner o menú "Agregar a la pantalla principal".
  2. Instalar y abrir la PWA como WebAPK en modo standalone (sin barra de navegador).
  3. En la ficha técnica, pulsar "Capturar ubicación GPS en campo".
  4. Conceder permisos de ubicación al navegador.
  5. En el modal de evidencia, pulsar "Seleccionar archivos desde el dispositivo" y activar la cámara.
  6. Capturar fotografía y verificar compresión local.
- **Resultado Esperado:**
  - La app se instala como icono nativo en el lanzador de Android con splash screen y color de tema `#1565C0`.
  - El GPS obtiene latitud y longitud con alta precisión (`enableHighAccuracy: true`) y genera GeoJSON.
  - La cámara se invoca directamente y la foto se comprime en el cliente vía Canvas reduciendo el tamaño a $< 300$ KB.
- **Resultado Actual:** Instalación WebAPK fluida, captura GPS precisa y compresión de imagen inmediata.
- **Estado:** ✅ PASS

---

### TC-RNF05-03: PWA Móvil en iOS (Apple Safari) — Carga y Compatibilidad WebKit
- **Módulo:** RNF-05 / Dispositivos Móviles Apple iOS
- **Precondiciones:** Dispositivo iPhone con iOS 17/18, Safari móvil.
- **Pasos de Ejecución:**
  1. Cargar el sistema en Safari móvil.
  2. Abrir menú Compartir y pulsar "Agregar a pantalla de inicio".
  3. Abrir la PWA desde la pantalla de inicio.
  4. Navegar entre vistas de evaluación y verificar ausencia de excepciones en consola WebKit.
- **Resultado Esperado:**
  - Reconocimiento de meta tag `apple-touch-icon-180x180.png`.
  - Ejecución de scripts sin fallas (bundle Workbox ES5 compatible).
  - Almacenamiento local en IndexedDB operativo.
- **Resultado Actual:** Carga limpia, renderizado responsive a 390px/414px sin zoom inesperado ni roturas de layout.
- **Estado:** ✅ PASS

---

### TC-RNF05-04: Sincronización Real Extremo a Extremo en Campo (Offline ➡️ Online)
- **Módulo:** RNF-05 / Resiliencia y Sincronización en Campo
- **Precondiciones:** Técnico de campo autenticado, catálogo precargado.
- **Pasos de Ejecución:**
  1. Desconectar la red por completo (modo avión o interrupción de interfaz).
  2. Iniciar una evaluación (`INICIAR_EVALUACION`).
  3. Registrar 2 respuestas a criterios con observaciones (`RESPUESTAS`).
  4. Adjuntar archivo GeoJSON con coordenadas GPS (`EVIDENCIA`).
  5. Finalizar la evaluación con observaciones finales (`FINALIZAR_EVALUACION`).
  6. Solicitar generación de informe de inspección (`GENERAR_INFORME`).
  7. Verificar que las 5 operaciones se encolan en `db.cola_sync` con timestamp monótono estricto.
  8. Restablecer la conectividad y disparar el procesamiento de cola.
- **Resultado Esperado:**
  - Cero llamadas fallidas perdidas en el vacío durante la desconexión.
  - Al volver la red, el procesador drena la cola en estricto orden FIFO.
  - Se transmiten las 5 operaciones con cabecera de autenticación Bearer y formato requerido (JSON y multipart para evidencias).
  - Las 5 operaciones transicionan a estado `'enviado'` en IndexedDB.
  - El contador de pendientes en la interfaz desciende a 0.
- **Resultado Actual:**
  - Verificado en suite automatizada `apps/web/src/lib/sync/sync-escenario-offline-online.test.ts`.
  - Orden FIFO exacto respetado, drenado al 100%, 0 pendientes restantes.
- **Estado:** ✅ PASS

