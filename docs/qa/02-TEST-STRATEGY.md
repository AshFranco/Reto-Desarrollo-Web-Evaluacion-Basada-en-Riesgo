# 02 - Test Strategy (Estrategia de Pruebas)
**Sistema PWA de Evaluación Basada en Riesgo (EBR/BPM)**  
**Cliente:** Ministerio de Salud Pública — DIGEMAPS  
**Versión del Documento:** 1.0  
**Fecha:** Septiembre 2026  

---

## 1. Enfoque General: Pirámide de Pruebas

La estrategia de calidad del sistema EBR/BPM se fundamenta en una pirámide de pruebas automatizadas y continuas para garantizar alta cobertura y detección temprana de defectos:

```
           / \
          /   \     E2E / Pruebas de Sistema (Escenarios de Origen, Modo Avión)
         /-----\
        /       \   Pruebas de Integración (API + Prisma + Guards + Outbox Sync)
       /---------\
      /           \ Pruebas Unitarias (Motor de Riesgo, Hooks, Servicios, Throttling)
     /-------------\
```

---

## 2. Tipos de Prueba y Niveles

### 2.1 Pruebas Unitarias (Unit Testing)
- **Objetivo:** Aislar y validar cada función matemática, servicio y componente de manera independiente.
- **Herramientas:**
  - `vitest` para `@ebr/risk-engine` (17 pruebas).
  - `jest` + `@nestjs/testing` para `apps/api` (52 pruebas).
  - `vitest` + `@testing-library/react` para `apps/web` (157 pruebas).
- **Cobertura Mínima Exigida:** $\ge 80\%$ en lógica de negocio del motor y servicios críticos.

### 2.2 Pruebas de Integración (Integration Testing)
- **Flujo Offline ↔ Online:** Verificación del pipeline `IndexedDB (Dexie)` $\rightarrow$ `Cola Outbox` $\rightarrow$ `Sincronizador con Backoff Exponencial` $\rightarrow$ `API Backend`.
- **Aislamiento Multi-Tenant (Seguridad):** Verificación con `EmpresaOwnershipGuard` de que ninguna solicitud, caso o evaluación pueda ser accedida por una empresa distinta (prevención de IDOR).
- **Persistencia en Base de Datos:** Verificación de restricciones de clave única, cascadas y triggers de auditoría sobre PostgreSQL 18.

### 2.3 Pruebas de Sistema y Funcionales (E2E / End-to-End)
- **Flujo del Ciclo Cerrado:**
  1. Empresa registra solicitud BPM.
  2. Coordinador revisa caso y asigna evaluador con fecha en calendario.
  3. Técnico inspecciona en modo avión, llena 45 preguntas y toma evidencias.
  4. PWA calcula $RE$, $RP$, $RT$ y determina frecuencia.
  5. Sincronización al recuperar red.
  6. Coordinador aprueba informe y cierra expediente.
  7. **Generación automática de la siguiente inspección** según la frecuencia calculada.

### 2.4 Pruebas de Seguridad (Security Testing)
- **Autenticación:** Cifrado de contraseñas con Argon2id, rotación obligatoria de refresh tokens, revocación en cascada ante reuso y bloqueo tras 5 intentos fallidos.
- **Autorización (RBAC):** Restricción de endpoints según los 5 roles mediante `RolesGuard`.
- **Integridad de Evidencias:** Claves opacas UUID para evitar path traversal (`../`) y validación de tipos MIME en el servidor.

---

## 3. Herramientas y Frameworks Utilizados

| Categoría | Herramienta | Propósito en el Proyecto |
|---|---|---|
| **Test Runner (Frontend & Engine)** | **Vitest 2.1** | Ejecución ultrarrápida compatible con ESM y Vite. |
| **Test Runner (Backend)** | **Jest 29.7** | Estándar de NestJS con soporte para TypeScript (`ts-jest`). |
| **Component Testing** | **React Testing Library** | Pruebas de UI orientadas al comportamiento del usuario. |
| **Mocking de Red** | **Mock Service Worker (MSW)** | Interceptación de peticiones HTTP en desarrollo y pruebas. |
| **Simulación de Base de Datos Local** | **fake-indexeddb** | Mock de IndexedDB en Node.js para probar Dexie sin navegador. |
| **Auditoría de Calidad Web** | **Google Lighthouse** | Validación de PWA instalable, rendimiento y accesibilidad. |

---

## 4. Criterios de Entrada y Salida (Entry & Exit Criteria)

### 4.1 Criterios de Entrada (Entry Criteria)
1. El código compila sin errores de TypeScript (`tsc --noEmit`).
2. Las dependencias están instaladas y auditadas (`npm audit`).
3. La base de datos local o de integración contiene las 51 tablas desplegadas.
4. Los catálogos oficiales de la DIGEMAPS están sembrados (`prisma:seed`).

### 4.2 Criterios de Salida (Exit Criteria para Producción)
1. **100% de pruebas automatizadas pasando:** Cero pruebas fallidas en `packages/risk-engine`, `apps/api` y `apps/web` (226/226 tests en verde).
2. **Cero defectos críticos o bloqueantes abiertos** en la bitácora de defectos.
3. **Paridad de cálculo verificada:** Comprobación matemática exacta de los casos de prueba del Excel oficial (con el factor 6 corregido según hallazgo D-01).
4. **Verificación de bloqueo:** Confirmación de que ninguna evaluación finalizada puede modificarse.
5. **Auditoría Lighthouse PWA $\ge 90$** en categorías de PWA e Instalabilidad.

---

## 5. Gestión de Datos de Prueba (Test Data Management)

- **Aislamiento:** Cada suite de pruebas unitarias utiliza mocks in-memory limpios (`beforeEach`) para evitar efectos secundarios entre pruebas.
- **Datos Reales de Semilla:** Para pruebas de integración se emplean los archivos fuente oficiales en formato JSON procesados en `apps/api/prisma/seed-data/`:
  - `ficha-bpm.json` (45 criterios, 34 secciones).
  - `categorias-alimento.json` (105 subcategorías).
  - `factores-riesgo.json` (6 factores ponderados).
  - `rangos-riesgo.json` (rangos de frecuencia).
