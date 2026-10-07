# UI Refactor Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose stable backend contracts for the refactored UI: manual area distribution, bracket progression views, weigh-in audit, and dashboard summaries. CSV import preview/confirm is documented but explicitly on stand by.

**Architecture:** Extend existing NestJS domain modules instead of creating a parallel API layer. New missing features must be added as modular units: DTO, use case/service, repository contract, persistence implementation, and focused tests. If an existing feature touched by this work is not modular enough to support the change without coupling unrelated responsibilities, first refactor it into focused services/use cases inside the same domain boundary, then add the new behavior.

**Tech Stack:** NestJS 10, TypeORM 0.3, PostgreSQL, Zod DTO validation, Vitest, existing `ApiResponse<T>` envelope.

---

## Current-State Findings

- Areas already have automatic distribution via `POST /competitions/:id/areas/distribute`, queue items via `area_queue_items`, and queue reads via `GET /areas/:id/queue`.
- The requested drag-and-drop endpoint is not the same thing as automatic distribution. It must move every queued fight for a `keyGroupId` together and rewrite positions transactionally.
- Key-group fight generation currently produces `ROUND_ROBIN` metadata for 2-3 athletes and `OLYMPIC_BRACKET` metadata for 4 athletes. Product decision: 2-athlete key groups must become `BEST_OF_THREE`; 3 athletes remain `ROUND_ROBIN`; 4 athletes remain Olympic, exposed as `OLYMPIC`.
- `MarkFightWinnerUseCase` already returns a narrow `nextFight`, but bracket list/detail endpoints do not return grouped phases or an explicit format.
- Weigh-in has `performedAt/performedBy` string. These are semantically equivalent to the frontend's `weighInEvaluatedAt/weighInEvaluatedByName`; expose frontend field names without duplicating equivalent columns. Add only missing data that cannot be derived, such as collaborator id and observation.
- CSV preview exists as JSON text input at `POST /competitions/:id/import/athletes/preview`. The requested upload preview plus `importId` confirmation is intentionally on stand by for now.
- Dashboard summary does not exist. `ListCompetitionsUseCase` returns competitions only; counts require aggregate repository queries.

## Decisions

- Use new endpoints without removing old ones. Existing clients continue working during UI migration.
- CSV import preview/confirm is out of active implementation scope in this plan revision. Do not create `athlete_imports`, upload preview endpoints, or confirm endpoints until this item is reactivated.
- Add a `KeyGroupBracketFormat` value object and derive format from generated fights/member count for now. Do not add a `key_groups.format` column unless product later needs manual override. This avoids a migration for data that is deterministic from current rules.
- Normalize Olympic response literal to `OLYMPIC`, while allowing existing metadata value `OLYMPIC_BRACKET` internally until generation metadata is cleaned up.
- Change `KeysFightGenerationStrategy` so 2-athlete key groups generate `BEST_OF_THREE`: two active fights immediately plus a third inactive/disabled response fight until the score is 1x1, or a persisted third fight only when needed after the second result. Prefer not persisting inactive fights unless the UI requires an id before activation.
- Preserve modular boundaries. A touched file should not gain mixed responsibilities. If a use case starts orchestrating parsing, authorization, formatting, persistence, and response shaping together, split those concerns into domain services before implementing the new behavior.
- Keep `gemini-2.5-flash` unchanged if touching workflow/docs fixtures that reference the default Gemini Flash model. Do not introduce older Flash identifiers.

## Modularity Requirements

Apply these rules to every active task:

- Missing features must be introduced as a vertical modular slice: DTO/schema, use case, optional domain service, repository interface method, TypeORM implementation, controller route, and focused tests.
- Existing code touched by the feature must be refactored when it blocks modular implementation. Example: if `MarkFightWinnerUseCase` grows best-of-three progression logic inline, extract `BestOfThreeProgressionService`.
- Do not create generic "manager" services. Split by business capability: queue reordering, bracket view building, best-of-three progression, dashboard aggregation, weigh-in audit mapping.
- Keep response shaping out of repositories. Repositories fetch data; use cases/services compose frontend views.
- Keep TypeORM query details out of controllers. Controllers validate transport input and call one use case.
- If refactoring existing behavior, preserve current public contracts unless the task explicitly changes that contract.

## Task 1: Area Distribution Endpoint

**Files:**
- Create: `src/domain/area/infra/http/dtos/move-key-group-area-distribution.dto.ts`
- Create: `src/domain/area/application/use-cases/move-key-group-area-distribution.use-case.ts`
- Modify: `src/domain/area/infra/http/area.controller.ts`
- Modify: `src/domain/area/area.module.ts`
- Modify: `src/domain/area/repository/IAreaQueueItemRepository.repository.ts`
- Modify: `src/domain/area/infra/persistence/area.repository.ts`
- Modify: `src/domain/fight/repository/IFightRepository.repository.ts`
- Modify: `src/domain/fight/infra/persistence/fight.repository.ts`
- Test: `src/domain/area/application/use-cases/move-key-group-area-distribution.use-case.spec.ts`
- Test: `src/domain/area/infra/http/area.controller.spec.ts` if controller coverage exists or add to nearest area controller spec.

- [ ] **Step 1: Add DTO for the requested payload**

```ts
import { z } from 'zod';

export const MoveKeyGroupAreaDistributionSchema = z.object({
  keyGroupId: z.coerce.number().int().positive(),
  fromAreaId: z.coerce.number().int().positive(),
  toAreaId: z.coerce.number().int().positive(),
  orderIndex: z.coerce.number().int().min(0),
});

export type MoveKeyGroupAreaDistributionDto = z.infer<
  typeof MoveKeyGroupAreaDistributionSchema
>;
```

- [ ] **Step 2: Add repository methods needed for an atomic reorder**

Add interface methods:

```ts
abstract listByAreaIds(areaIds: number[]): Promise<AreaQueueItem[]>;
abstract replaceForAreas(input: {
  areaIds: number[];
  items: AreaQueueItem[];
}): Promise<AreaQueueItem[]>;
```

Add fight repository method:

```ts
abstract listByKeyGroupId(keyGroupId: number): Promise<FightEntity[]>;
abstract assignAreas(
  assignments: Array<{ fightId: number; areaId: number | null }>,
): Promise<void>;
```

`listByKeyGroupId` and `assignAreas` already exist in TypeORM implementation; ensure the interface exposes them if it does not.

- [ ] **Step 3: Implement use case**

Rules:
- Validate competition exists.
- Validate both areas exist and belong to the same competition.
- Fetch all non-canceled fights for `keyGroupId`; reject if none.
- Reject if any fight in the group is `CALLED` or `IN_PROGRESS`; moving active queue items creates operational ambiguity.
- Fetch queue items from `fromAreaId` and `toAreaId`.
- Require every non-canceled fight in the group currently queued in `fromAreaId`; otherwise return `ValidationError('Key group is not fully allocated in the source area')`.
- Remove group items from source queue, insert into destination queue at `orderIndex`, reassign contiguous positions starting at 1 for both affected areas.
- Update `fights.areaId` for every moved fight to `toAreaId`.
- Publish `queue.updated` with both area ids.
- Return `{ areas: AreaQueueView[] }` using existing `GetAreaQueueUseCase` for both areas.

- [ ] **Step 4: Add controller route**

Add to `AreaController`:

```ts
@Patch('competitions/:id/areas/distribution')
async moveDistribution(
  @Param(new ZodValidationPipe(CompetitionAreaParamSchema))
  params: CompetitionAreaParamDto,
  @Body(new ZodValidationPipe(MoveKeyGroupAreaDistributionSchema))
  body: MoveKeyGroupAreaDistributionDto,
) {
  const result = await this.moveKeyGroupAreaDistributionUseCase.execute({
    competitionId: params.id,
    keyGroupId: body.keyGroupId,
    fromAreaId: body.fromAreaId,
    toAreaId: body.toAreaId,
    orderIndex: body.orderIndex,
  });

  return { data: result, error: null };
}
```

- [ ] **Step 5: Test**

Run:

```bash
npm test -- src/domain/area/application/use-cases/move-key-group-area-distribution.use-case.spec.ts
```

Expected:
- Moving a group updates all fight `areaId`s.
- Source and destination positions are contiguous.
- Moving partial group fails.
- Moving called/in-progress fight fails.
- Response contains updated queues for source and destination.

## Task 2: Bracket Format and Phase Response

**Files:**
- Create: `src/domain/key-group/domain/value-objects/key-group-bracket-format.enum.ts`
- Create: `src/domain/key-group/application/services/key-group-bracket-view-builder.service.ts`
- Modify: `src/domain/key-group/repository/IKeyGroupRepository.repository.ts`
- Modify: `src/domain/key-group/infra/persistence/key-group.repository.ts`
- Modify: `src/domain/key-group/application/use-cases/get-key-group-details.use-case.ts`
- Modify: `src/domain/key-group/application/use-cases/list-key-groups.use-case.ts`
- Modify: `src/domain/key-group/application/strategies/keys-fight-generation.strategy.ts`
- Modify: `src/domain/key-group/application/strategies/four-athlete-olympic-bracket-fight-generation.strategy.ts`
- Modify: `src/domain/fight/application/use-cases/mark-fight-winner.use-case.ts`
- Test: `src/domain/key-group/application/services/key-group-bracket-view-builder.service.spec.ts`
- Test: `src/domain/key-group/application/use-cases/generate-fights-for-key-group.use-case.spec.ts`
- Test: `src/domain/fight/application/use-cases/mark-fight-winner.use-case.spec.ts`
- Test: `src/domain/key-group/infra/persistence/key-group.repository.spec.ts` if present; otherwise add focused use-case specs.

- [ ] **Step 1: Define explicit public format literals**

```ts
export enum KeyGroupBracketFormat {
  BEST_OF_THREE = 'BEST_OF_THREE',
  OLYMPIC = 'OLYMPIC',
  ROUND_ROBIN = 'ROUND_ROBIN',
}
```

- [ ] **Step 2: Return stable grouped phases**

Add view fields to key-group detail:

```ts
bracketFormat: KeyGroupBracketFormat;
phases: Array<{
  phase: string;
  round: number;
  order: number;
  fights: Array<KeyGroupDetailsFightView & { enabled: boolean }>;
}>;
standings?: Array<{
  athleteId: number;
  athleteName: string;
  wins: number;
  losses: number;
  points: number;
}>;
```

Phase naming:
- `ROUND_ROBIN`: one phase, `round=1`, `phase='Round robin'`.
- `OLYMPIC`: `round=1` as `Semifinals`, highest round as `Final`.
- `BEST_OF_THREE`: one phase, `phase='Best of 3'`, fights ordered `1,2,3`.

- [ ] **Step 3: Format derivation**

Use deterministic rules:
- `fights.length === 3` and all fights use the same two athletes => `BEST_OF_THREE`.
- any fight has `round > 1` or member count is 4 with three generated fights => `OLYMPIC`.
- otherwise `ROUND_ROBIN`.

Product decision: 2-athlete key groups must no longer be treated as ordinary round-robin. Generation and response formatting must both classify them as `BEST_OF_THREE`.

- [ ] **Step 4: Generate best-of-three for 2-athlete key groups**

Change `KeysFightGenerationStrategy.generate()`:
- 2 unique athletes => generate two persisted fights with `round=1`, `order=1`, `order=2`, same pair.
- 3 unique athletes => keep current round-robin pair generation.
- 4 unique athletes => keep Olympic strategy.

Recommended backend approach:
- do not persist inactive fights as real fights unless the UI needs a fight id before it exists;
- return virtual inactive fight in bracket view:

```ts
{
  id: null,
  keyGroupId,
  orderIndex: 3,
  enabled: false,
  status: 'PENDING',
  athleteAId,
  athleteBId
}
```

Persist the third fight when `MarkFightWinnerUseCase` detects a 1x1 score after the first two best-of-three fights. If the first two fights produce 2x0, the third fight remains virtual/inactive in the response and must not enter the area queue.

Add a focused service if needed:

```ts
export class BestOfThreeProgressionService {
  shouldCreateThirdFight(fights: FightEntity[]): boolean {
    const finished = fights.filter((fight) => fight.status === FightStatus.FINISHED);
    const winsByAthlete = new Map<number, number>();

    for (const fight of finished) {
      if (fight.winnerId === null) continue;
      winsByAthlete.set(fight.winnerId, (winsByAthlete.get(fight.winnerId) ?? 0) + 1);
    }

    return finished.length === 2 && Array.from(winsByAthlete.values()).every((wins) => wins === 1);
  }
}
```

- [ ] **Step 5: Olympic winner response**

Extend `MarkFightWinnerUseCase` output `nextFight` to include enough UI data:

```ts
nextFight: {
  id: number;
  keyGroupId: number | null;
  round: number;
  orderIndex: number;
  athleteAId: number | null;
  athleteBId: number | null;
  status: FightStatus;
  areaId: number | null;
} | null
```

The current narrow `nextFight` already exists; this is an additive response change.

- [ ] **Step 6: Round-robin standings**

Compute standings from finished fights:
- `wins`: count where `winnerAthleteId === athleteId`.
- `losses`: count where athlete participated and winner is the other athlete.
- `points`: start with `wins * 3`; keep this simple unless product has tie-break rules.
- Sort by `points DESC`, `wins DESC`, `losses ASC`, `athleteName ASC`.

## Task 3: Weigh-In Evaluation Audit

**Files:**
- Create: `src/database/migrations/<timestamp>-add-weigh-in-audit-fields.ts`
- Modify: `src/domain/weighin/domain/entities/weigh-in.entity.ts`
- Modify: `src/domain/weighin/infra/persistence/entities/weigh-in.typeorm-entity.ts`
- Modify: `src/domain/weighin/infra/persistence/mappers/weigh-in.mapper.ts`
- Modify: `src/domain/weighin/infra/http/dtos/confirm-weigh-in.dto.ts`
- Modify: `src/domain/weighin/infra/http/weigh-in.controller.ts`
- Modify: `src/domain/weighin/application/use-cases/confirm-weigh-in.use-case.ts`
- Modify: `src/domain/weighin/application/use-cases/reset-weigh-in.use-case.ts`
- Modify: `src/domain/weighin/application/use-cases/weigh-in-status.view.ts`
- Modify: `src/domain/athlete/application/use-cases/athlete-list-item.view.ts`
- Modify: `src/domain/athlete/application/use-cases/search-athletes.use-case.ts`
- Test: `src/domain/weighin/application/use-cases/weigh-in.use-cases.spec.ts`
- Test: `src/domain/athlete/application/use-cases/athlete.use-cases.spec.ts`

- [ ] **Step 1: Migration and nomenclature policy**

Do not create duplicate columns for data that already exists with equivalent semantics:
- Existing `performed_at` is the same business event as frontend `weighInEvaluatedAt`.
- Existing `performed_by` is the same business event as frontend `weighInEvaluatedByName` when it stores the collaborator/display name.

Add only missing nullable columns:
- `weigh_ins.performed_by_id int null`
- `weigh_ins.observation text null`

Keep existing `performed_at/performed_by` for backward compatibility and expose frontend field names from the API mapper/view:
- `weighInEvaluatedAt` -> `performedAt`
- `weighInEvaluatedById` -> `performedById`
- `weighInEvaluatedByName` -> `performedBy`
- `weighInObservation` -> `observation`

Internal entity naming can remain `performed*` because it matches the persisted schema and avoids semantic duplication. Response naming must match the frontend contract.

- [ ] **Step 2: Confirm endpoint accepts observation**

Extend DTO:

```ts
observation: z.string().trim().max(1000).optional().nullable()
```

Use `@CurrentUser()` instead of only `x-performed-by`; persist:
- `performedById = currentUser.sub`
- `performedBy = currentUser.name` if available, otherwise query `IUserRepository.findById(currentUser.sub)` or fallback to existing header.
- `observation = body.observation?.trim() || null`

- [ ] **Step 3: Reset clears audit**

`reset()` must set:
- `measuredWeightGrams = null`
- `status = PENDING`
- `performedAt = null`
- `performedBy = null`
- `performedById = null`
- `observation = null`

Return the reset state explicitly in the existing response envelope.

- [ ] **Step 4: Athlete response fields**

Add minimum required fields wherever athlete rows are returned to UI:

```ts
weighInEvaluatedById: number | null;
weighInEvaluatedByName: string | null;
weighInEvaluatedAt: Date | null;
weighInObservation: string | null;
```

Do this in `SearchAthletesUseCase` by joining/fetching weigh-ins in batch, not one query per athlete.

## Task 4: CSV Import Preview and Confirm - Stand By

**Files:**
- No active file changes in this implementation pass.

- [ ] **Step 1: Do not implement CSV changes now**

CSV import preview/confirm is intentionally on stand by. Do not create:
- `athlete_imports` migration/table.
- `IAthleteImportRepository`.
- multipart upload preview endpoint.
- `POST /competitions/:competitionId/athletes/imports/:importId/confirm`.
- duplicate-candidate workflow.

- [ ] **Step 2: Preserve existing CSV behavior**

Keep existing endpoints and tests unchanged:
- `POST /competitions/:id/import/athletes/preview`
- `POST /competitions/:id/import/athletes`

Only touch CSV files if another active task breaks compilation or imports. If touched for compilation, keep the change mechanical and do not alter behavior.

- [ ] **Step 3: Future activation note**

When CSV work is reactivated, use the previously proposed durable-preview design: persisted import session, mapped columns, invalid rows, duplicate candidates, normalized athletes, and confirm by `importId`. Do not use process memory for `importId`.

## Task 5: Dashboard Summary Endpoint

**Files:**
- Create: `src/domain/competition/application/use-cases/get-dashboard-summary.use-case.ts`
- Create: `src/domain/competition/application/use-cases/dashboard-summary.view.ts`
- Modify: `src/domain/competition/repository/ICompetitionRepository.repository.ts`
- Modify: `src/domain/competition/infra/persistence/competition.repository.ts`
- Modify: `src/domain/competition/infra/http/competition.controller.ts`
- Modify: `src/domain/competition/competition.module.ts`
- Test: `src/domain/competition/application/use-cases/get-dashboard-summary.use-case.spec.ts`
- Test: `src/domain/competition/infra/http/competition.controller.spec.ts`

- [ ] **Step 1: Add endpoint**

Because `CompetitionController` has `@Controller('competitions')`, route method should be:

```ts
@Get('dashboard-summary')
async dashboardSummary(@CurrentUser() currentUser: AuthenticatedUser) {
  const data = await this.getDashboardSummaryUseCase.execute({
    currentUserId: currentUser.sub,
  });

  return { data, error: null };
}
```

This yields `GET /competitions/dashboard-summary`.

- [ ] **Step 2: Repository aggregate query**

Return one row per accessible competition:

```ts
type DashboardSummaryItem = {
  competitionId: number;
  name: string;
  athleteCount: number;
  areaCount: number;
  fightsTodayCount: number;
  status: 'DRAFT' | 'READY' | 'IN_PROGRESS' | 'FINISHED';
  ruleTypeLabel: string;
};
```

Aggregate strategy:
- `athleteCount`: count athletes by `competition_id`.
- `areaCount`: count areas by `competition_id`.
- `fightsTodayCount`: count fights where `DATE(started_at) = CURRENT_DATE OR DATE(finished_at) = CURRENT_DATE`; if no fight timestamps exist, use `created_at` only if product confirms that means scheduled today.
- `status`: derive:
  - `DRAFT` when no fights exist;
  - `READY` when fights exist and none started/finished;
  - `IN_PROGRESS` when any fight is `CALLED` or `IN_PROGRESS`, or some finished but not all terminal;
  - `FINISHED` when all fights are `FINISHED` or `CANCELED`.
- `ruleTypeLabel`: map `KEYS -> Chaves`, `ABSOLUTE_GP -> Absoluto GP`.

## Task 6: Integration and Regression Verification

**Files:**
- Modify tests listed in previous tasks.
- No production files beyond the task-specific list.

- [ ] **Step 1: Run focused tests**

```bash
npm test -- src/domain/area/application/use-cases/move-key-group-area-distribution.use-case.spec.ts
npm test -- src/domain/key-group/application/services/key-group-bracket-view-builder.service.spec.ts
npm test -- src/domain/key-group/application/use-cases/generate-fights-for-key-group.use-case.spec.ts
npm test -- src/domain/fight/application/use-cases/mark-fight-winner.use-case.spec.ts
npm test -- src/domain/weighin/application/use-cases/weigh-in.use-cases.spec.ts
npm test -- src/domain/competition/application/use-cases/get-dashboard-summary.use-case.spec.ts
```

- [ ] **Step 2: Run controller tests**

```bash
npm test -- src/domain/area/infra/http/area.controller.spec.ts
npm test -- src/domain/competition/infra/http/competition.controller.spec.ts
npm test -- src/domain/athlete/infra/http/athlete.controller.spec.ts
```

- [ ] **Step 3: Run full suite**

```bash
npm test
```

- [ ] **Step 4: Build**

```bash
npm run build
```

## Implementation Order

1. Area manual distribution. It unblocks the drag-and-drop UI and is isolated.
2. Weigh-in audit. It needs a small migration only for missing data, while existing equivalent fields are exposed under frontend names.
3. Dashboard summary. It is read-only and validates aggregate access patterns.
4. Bracket response shape and 2-athlete best-of-three generation. It touches core tournament semantics and should be tested after existing behavior is locked.
5. CSV preview/confirm remains on stand by and must not be implemented in this pass.

## Risks

- `BEST_OF_THREE` is not currently a first-class generation mode. Product now requires 2-athlete keys to use it, so generation, progression, queue insertion, and bracket view must change together.
- `fightsTodayCount` is underspecified because fights do not appear to have a scheduled date field. Counting by `startedAt/finishedAt` is operationally defensible; counting by `createdAt` is weaker.
- CSV import preview/confirm is intentionally excluded. Any executor implementing it in this pass is expanding scope incorrectly.
- Manual area moves should reject active fights. Allowing moves during `CALLED`/`IN_PROGRESS` would desynchronize desk/scoreboard expectations.

## Completion Criteria

- `PATCH /competitions/:competitionId/areas/distribution` moves a full key group and returns updated queues.
- Key-group detail/list responses expose `bracketFormat`, grouped `phases`, and round-robin `standings` where applicable.
- Winner confirmation returns a rich `nextFight` payload.
- Weigh-in responses include `weighInEvaluatedById`, `weighInEvaluatedByName`, `weighInEvaluatedAt`, and `weighInObservation`.
- Existing CSV import endpoints remain unchanged; upload preview/confirm by `importId` is not part of this implementation pass.
- `GET /competitions/dashboard-summary` returns compact per-competition metrics without UI-side estimation.
- Focused tests, full `npm test`, and `npm run build` pass.
