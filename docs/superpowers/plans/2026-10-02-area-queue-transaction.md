# Transação nas gravações de fila de área — Plano

**Goal:** Gravação da fila de área (`area_queue_items`) e da área da luta (`fights.area_id`) acontecem juntas ou não acontecem — nenhuma luta fica sem área/fila se algo falhar no meio.

**Architecture:** Nova porta `IAreaQueueTransaction.run(work)` (domínio `area`) que entrega ao `work` repositórios de fila e de luta ligados à mesma transação. Implementação TypeORM usa `DataSource.transaction` e instancia `AreaRepository`/`FightRepository` com o `EntityManager` da transação (mesmo padrão de `FightRepository.withTransaction`). Fake em memória com rollback real (snapshot/restore) para os testes.

**Callers (todas as escritas de fila):**
1. `MoveFightAreaUseCase` — `replaceForAreas` + `assignAreas`
2. `MoveKeyGroupAreaDistributionUseCase` — idem
3. `FightQueueWriterService.applyFull` / `applyIncremental` — `assignAreas` + `replaceForCompetition` / `createManyQueueItems`
4. `UpdateFightOrderUseCase` — `updateOrder` + `replaceForAreas`

**Testes (RED primeiro, um por caller):** a segunda escrita falha (spy rejeita) → use case rejeita **e** o estado de fila e lutas fica igual ao de antes. Sem transação, a primeira escrita já gravou → teste falha.

**Files:**
- Create: `Back/src/domain/area/repository/IAreaQueueTransaction.repository.ts`, `Back/src/domain/area/infra/persistence/typeorm-area-queue-transaction.ts` (+ spec), `Back/test/repositories/in-memory/in-memory-area-queue-transaction.ts`
- Modify: `area-provider.module.ts` (provide/export), os 4 callers e seus specs, `in-memory-fight.repository.ts` e `in-memory-area-queue-item.repository.ts` (`snapshot()`), `test/repositories/in-memory/index.ts`

**Verify:** `cd Back && npx tsc --noEmit -p tsconfig.json && npx vitest run`
