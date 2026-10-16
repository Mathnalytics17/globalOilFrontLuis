# Frontend architecture — Checkpoint 04

## Goal

The frontend is organized by feature so Next.js route files are adapters rather than implementation containers. The structure deliberately avoids a fake "Clean Architecture" achieved only by renaming service files.

```text
pages/                    Next.js route adapters only
src/
  app/                    Application shell and layout
  features/
    <feature>/
      application/        Pure rules, transformations and session/access logic
      infrastructure/     HTTP/API adapters and repositories
      presentation/       Pages, components and React state/UI
  infrastructure/         Cross-feature infrastructure (Axios client)
  shared/
    hooks/                 Reusable hooks with no feature dependency
    ui/                    Reusable UI primitives
    utils/                 Reusable pure utilities
```

## Boundaries now enforced

- `pages/` must not import feature infrastructure directly.
- `src/shared/` must not depend on features or the app shell.
- feature `application/` must not import `presentation/` or `infrastructure/`.
- feature `infrastructure/` must not import `presentation/` or the app shell.
- authentication React context lives in `auth/presentation/context`, not `application`.

These constraints are encoded in `eslint.config.mjs`.

## Intentional pragmatic boundary

Some React presentation screens still orchestrate feature infrastructure services directly. Those calls are mostly CRUD/API orchestration, not domain rules. We intentionally did not create pass-through "use case" files whose only purpose would be to rename a service. If domain/business rules grow, the next correct step is to define application ports/use cases and bind concrete repositories in a composition root.

## Routing

All large route implementations were moved under their feature presentation layer. `pages/` is now approximately 362 lines across 67 route files, including framework files, redirects, permission wrappers and route adapters.

## Removed legacy structure

The following duplicate/legacy trees were removed after reachability analysis:

- root `shared/`
- `src/components/`
- `src/utils/`
- root `utils/`
- duplicate `src/features/tiposGestionMuestras/`
- the old `auth/application/AuthContext.jsx`

Reachable shared code now lives in `src/shared` or the feature that owns it.
