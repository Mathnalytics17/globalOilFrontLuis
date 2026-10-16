# Limpieza de dependencias e imports

## Dependencias directas

Antes: **34** dependencias runtime y **11** dev dependencies.

Ahora: **9** dependencias runtime y **10** dev dependencies.

### Dependencias runtime conservadas

- axios
- lucide-react
- next
- react
- react-dom
- react-quill
- react-toastify
- recharts

### Dependencias directas eliminadas

- @emotion/cache
- @emotion/react
- @emotion/server
- @emotion/styled
- @heroicons/react
- @mui/icons-material
- @mui/material
- @mui/x-data-grid
- @toolpad/core
- bootstrap
- dayjs
- formik
- framer-motion
- lodash
- next-auth
- react-bootstrap
- react-d3-tree
- react-datepicker
- react-grid-layout
- react-icons
- react-router-dom
- react-signature-canvas
- styled-components
- xlsx
- yup

También se eliminó `@types/styled-components` de dev dependencies.

`package-lock.json` fue regenerado con `npm install --package-lock-only`: pasó de **769** entradas de paquetes a **489**. Algunos paquetes como lodash pueden seguir apareciendo de forma transitiva si una dependencia conservada los necesita; ya no son dependencias directas del proyecto.

## Imports y código muerto

Se migraron aliases a `src/*`, se eliminaron imports hacia el antiguo `shared/`, y se borraron archivos JS/TS que ya no eran alcanzables desde ninguna ruta.

Validación estática actual:

- imports locales no resueltos: **0**;
- identificadores de import sospechosos de no usarse: **0**;
- archivos JS/TS muertos según grafo de imports: **0**;
- referencias de código a MUI, Emotion, Bootstrap, React-Bootstrap, styled-components, framer-motion, Toolpad, React Router, etc.: **0**.
