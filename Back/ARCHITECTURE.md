# Architecture Standard

This project follows a modular architecture with clear separation between
domain rules, application orchestration, and infrastructure.

## Standard Module Structure

Every business module must follow this internal structure:

```text
src/
  <module>/
    domain/
      entities/
      value-objects/
      services/
      strategies/
    application/
      use-cases/
      ports/
    infra/
      http/
      ws/
      persistence/
```

## Layer Responsibilities

### `domain/`

Contains pure business rules.

- `entities/`: business state and invariants
- `value-objects/`: immutable concepts such as weight, age range, status
- `services/`: pure domain rules that do not belong to one entity
- `strategies/`: interchangeable business algorithms

### `application/`

Coordinates use cases and defines contracts with the outside world.

- `use-cases/`: application flows
- `ports/`: repository interfaces, gateways, event bus contracts

### `infra/`

Contains technical implementation details.

- `http/`: controllers and DTOs
- `ws/`: websocket gateways and message contracts
- `persistence/`: TypeORM repositories and persistence adapters

## Global Structure

The project must also keep these global areas:

```text
src/
  shared/
  database/
```

- `shared/`: errors, result/either, utilities, simple event bus
- `database/`: connection config and migrations

## Rules

1. `domain/` must not depend on `infra/`.
2. `application/` can depend on `domain/` and `ports/`, but not on concrete
   TypeORM repositories or Nest controllers.
3. `infra/` implements the contracts defined in `application/ports/`.
4. Controllers must call use cases, not repositories directly.
5. Repositories must be injected by contracts, never by concrete classes in
   services and use cases.
6. Tests should prefer factories and in-memory implementations of
   `application/ports/`.

## Migration Guidance

The current codebase is in transition. New modules must follow this structure
from the start. Existing modules should be migrated incrementally whenever they
are changed.
