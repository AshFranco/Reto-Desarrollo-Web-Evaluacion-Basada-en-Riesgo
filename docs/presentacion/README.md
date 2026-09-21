# Presentación Interactiva del Sistema EBR / BPM (SINEC · MSP / DIGEMAPS)

Este directorio contiene la presentación interactiva web desarrollada en **HTML5, CSS3 y JavaScript Vanilla** para la exposición del sistema.

## 🚀 Cómo Visualizar la Presentación

1. **Abrir en el Navegador:**
   Simplemente haz doble clic o abre el archivo [`presentacion_preview.html`](presentacion_preview.html) en cualquier navegador moderno (Chrome, Edge, Firefox, Safari).
   - No requiere servidor web ni dependencias externas.
   - Es 100% autónomo y portable (incluye el escudo oficial en Data URI y tipografías optimizadas).

2. **Controles de Navegación:**
   - `→` / `↓` / `Espacio` / `AvPág`: Avanzar a la siguiente diapositiva.
   - `←` / `↑` / `RePág` / `Retroceso`: Retroceder a la diapositiva anterior.
   - `Home`: Ir a la primera diapositiva (Portada).
   - `End`: Ir a la última diapositiva.
   - `O`: Abrir / Cerrar el **Mosaico de Diapositivas (Vista General)** para saltar a cualquier diapositiva.
   - `F`: Alternar modo **Pantalla Completa**.
   - **Táctil (Móvil / Tablet):** Deslizar hacia la izquierda o derecha (*swipe*).

## 📊 Diapositivas de Muestra (Prototipo Inicial)

1. **Slide 1 — Portada Institucional:** Escudo oficial con efecto dinámico, fichas de los 5 integrantes (Diana Ferreras, Gabriela Duverge, Ashley Franco, Jorge Melo, Rowlis Trinidad) y metadatos del proyecto.
2. **Slide 2 — Diagnóstico (Problema Real vs. Solución):** Comparativa del proceso manual en Excel (111 subcategorías manuales, fotos por chat, demoras de 14 días) frente a la infraestructura SINEC (cálculo determinista dual, PWA offline, PDF oficial inmediato con QR y fotos geolocalizadas).
3. **Slide 3 — Ecosistema de Usuarios (RBAC):** Interfaz y responsabilidades de los 5 roles internos (Técnico, Coordinador, Director, Jurídico, Administrador) y el Ciudadano (portal público de denuncias y consulta QR).
4. **Slide 4 — Motor de Riesgo EBR & Simulador en Vivo:** Explicación de la fórmula $RT = RP \times RE$ con calculadora interactiva en tiempo real (sliders funcionales para simular la variación del riesgo y la frecuencia de inspección reglamentaria).

## 🛠️ Generador

Para regenerar o compilar la presentación con nuevos cambios:
```bash
node docs/presentacion/build_preview.js
```
