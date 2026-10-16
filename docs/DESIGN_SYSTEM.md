# Global Oil design system

The visual direction is a sober industrial/laboratory interface: restrained dark surfaces, compact controls, minimal decoration, and red reserved mainly for key actions and selection.

## Source of truth

The canonical tokens and reusable control styles live in `src/shared/styles/design-system.css`. `pages/globals.css` contains compatibility rules for screens that are still being migrated. New screens should use the shared primitives instead of adding a new local table/button system.

## Core layout tokens

- sidebar expanded width: `224px`
- sidebar rail width: `62px`
- top bar height: `58px`
- standard control height: `36px` (`34px` on small phones)
- content max width: `1600px`
- table / field typography: approximately `12–13px`

## Navigation and responsive behavior

- At `1280px` and above the sidebar can remain docked. Below that width it becomes an overlay drawer so it does not steal horizontal space from tables on tablets and small laptops.
- The Muestras sidebar intentionally exposes only **Lotes de muestras** and **Ingresar lote de muestras**. Assignment, result entry, review and interpretation remain business-process routes reached from the lot workflow.
- The header has no notification bell. The system does have **email notification rules**, but they are configuration/delivery features rather than an in-app realtime notification center. Use a mail icon for those screens/actions.

## Shared primitives

`src/shared/ui/` is the reusable UI vocabulary:

- `PageHeader` — page title, subtitle and compact actions.
- `MetricStrip` — summary metrics without oversized cards.
- `Button` — shared button sizing and variants.
- `Field` — shared label/control wrapper.
- `OverflowMenu` — secondary row actions.
- `PaginationBar` — consistent pagination.
- `DataTable` — canonical data-list component. On desktop it renders a compact horizontally scrollable table; on phones it automatically renders readable cards. It supports local or controlled sorting, nested rows, actions and selection.

## Rules

- Avoid creating a second table component for a normal list. Prefer `DataTable`. Specialized matrices/editors can remain custom, but must use the same control scale and responsive rules.
- No gradients or decorative glow.
- Avoid nested cards when spacing/dividers are sufficient.
- One obvious primary action per context when possible.
- Row-level secondary actions belong in `OverflowMenu` where possible.
- Inputs and normal buttons use the shared 36px control scale.
- Semantic colors are reserved for status/error/warning/success meaning. Do not use multiple accent colors just for decoration.
- On mobile, prefer stacked fields/cards over squeezing text into narrow fixed table columns.
