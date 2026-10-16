# Auditoría de arquitectura — 2026-09-21

## Resumen

El frontend pasó de una estructura híbrida (`pages/`, `src/`, `shared/`, `utils/`) a una arquitectura **feature-oriented con límites inspirados en Clean Architecture**. La mejora más importante es que `pages/` dejó de contener lógica de negocio y acceso HTTP: ahora actúa como capa de rutas/adaptadores de Next.js.

No se debe presentar el resultado como una Clean Architecture académicamente pura todavía. La deuda que queda está localizada: varias pantallas dentro de `presentation/` llaman directamente a servicios de su `infrastructure/`. La separación actual ya evita el mayor acoplamiento (rutas ↔ HTTP, shared ↔ features y application ↔ UI/infra), pero la inversión completa de dependencias requeriría introducir puertos/use cases y composición de dependencias por feature.

## Cambios estructurales realizados

### 1. `pages/` convertido en capa de rutas

Se movieron las implementaciones grandes de máquinas, empresas, dashboard, lotes, laboratorio, pruebas, documentos y autenticación a `src/features/*/presentation/pages`. Las rutas conservan su URL y exportan el componente correspondiente.

Resultado de la auditoría estática:

- archivos de ruta que importan infraestructura directamente: **22 → 0**;
- LOC dentro de `pages/`: **10.743 → 526**;
- todos los archivos JS/TS actuales alcanzables desde una ruta: **173/173**.

### 2. `shared/` consolidado dentro de `src/shared`

Se eliminó el árbol legacy de raíz `shared/` y los duplicados `src/components`, `src/utils` y `utils`. Los elementos realmente usados quedaron organizados en:

- `src/shared/ui`;
- `src/shared/hooks`;
- `src/shared/utils`;
- `src/shared/styles`.

`src/shared` no importa `app`, `features` ni `infrastructure`.

### 3. Features con capas explícitas

Los módulos principales están agrupados por capacidad de negocio: `auth`, `asset-tree`, `companies`, `dashboard`, `documents`, `machines`, `reports`, `samples`, `security`, `technical-config` y `tests`.

Donde existe lógica pura reutilizable se mantiene en `application/`; HTTP y adaptadores viven en `infrastructure/`; React vive en `presentation/`.

El `AuthContext`, que depende de React/router/toasts, fue movido de `application` a `presentation/context`, evitando mezclar UI/framework con la capa de aplicación.

### 4. Reglas de arquitectura en ESLint

`eslint.config.mjs` impide regresiones importantes:

- `pages/` no puede importar infraestructura;
- `src/shared` no puede depender de features/app/infra;
- `application` no puede depender de presentation/infrastructure/app;
- `infrastructure` no puede depender de presentation/app.

## Deuda arquitectónica restante

La deuda principal está en la dirección `presentation -> infrastructure` dentro de varios features. En una Clean Architecture estricta, presentation debería invocar casos de uso/puertos de `application`, y las implementaciones HTTP deberían inyectarse desde una composition root.

También quedan pantallas complejas que conviene dividir por responsabilidad, especialmente:

- `SampleTestAssignmentPage`;
- `NewSampleBatchPage`;
- `ResultEntryPage`;
- `SampleInterpretationPage`;
- `TechnicalLimitsFinalPage`.

El refactor recomendado es incremental: extraer primero hooks/controladores de aplicación y componentes de sección, sin cambiar contratos del backend ni URLs.

## Conclusión

La base ya está preparada para evolucionar sin volver a la mezcla anterior. La arquitectura actual es significativamente más limpia y tiene barreras automáticas contra varias regresiones, pero conserva de forma explícita una última frontera de trabajo (`presentation -> infrastructure`) que no conviene ocultar ni resolver mediante simples re-exports disfrazados de casos de uso.
