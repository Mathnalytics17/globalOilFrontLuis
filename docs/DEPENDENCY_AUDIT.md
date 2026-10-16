# Dependency audit — Checkpoint 04

## Runtime dependencies retained

Only packages with reachable imports remain as direct runtime dependencies:

- `axios`
- `lucide-react`
- `next`
- `react`
- `react-dom`
- `react-quill`
- `react-toastify`
- `recharts`

Runtime direct dependencies: **9**.

## Removed direct runtime dependencies

The cleanup removed packages that no reachable application code imports, including the former MUI/Emotion stack, Bootstrap/React-Bootstrap, styled-components, Framer Motion, Toolpad, Formik/Yup, React Router, extra icon libraries, grid/date/tree/signature helpers, `xlsx`, `next-auth`, lodash and dayjs.

The lockfile was regenerated with `npm install --package-lock-only --ignore-scripts --offline` after editing `package.json`.

Current lockfile package entries: **489**.

## Import cleanup

- local unresolved imports: **0**
- undeclared external modules: **0**
- files with unused imports in the static identifier scan: **0**
- duplicate default exports: **0**
