# Front Bug Fixes (varredura 2026-10-01) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Waves follow `~/.claude/docs/ondas.md` (implementer does NOT commit).

**Goal:** Cobrir com teste e corrigir os 10 bugs confirmados na varredura do Front (+ 1 latente), e implementar "mover uma luta para outra área" por arrastar.

**Architecture:** Cada correção vira (a) teste que falha primeiro e (b) mudança mínima. Lógica testável sai do componente gigante para `lib/` pura ou para o client de API (padrão já usado no repo: `lib/*.test.ts`, `api/*-client.test.ts`). A única feature nova (mover luta) ganha use case no Back espelhando `MoveKeyGroupAreaDistributionUseCase`.

**Tech Stack:** Next.js 15, React 19, react-query 5, zustand, vitest (Front); NestJS, zod, vitest (Back).

**Spec:** memória `project_front_bug_sweep_2026_10_01.md` + decisões do usuário em 2026-10-01:
- Pesagem: remover coluna e filtro "Categoria".
- Arrastar: mover **uma luta** (não a chave inteira) para outra área — caso de uso: área vazia enquanto outra está cheia.

## Global Constraints

- Ler `CONSTRAINTS.md`: `tsc --noEmit` limpo, lint sem erro novo, vitest verde. Nunca pular/afrouxar teste.
- Arquivo novo ≤ 350 linhas. Arquivos já acima (fights-tab, categories-page, areas-distribution-page…) não precisam ser refatorados, mas não crescer sem necessidade.
- Front: `cd Front/tournament-jj && npx vitest run <arquivo>`; Back: `cd Back && npx vitest run <arquivo>`.
- Textos de UI em português, mesmo tom dos existentes.
- Teste precisa FALHAR antes da correção (rodar e ver falhar).
- Não commitar.

---

## Onda 1 (paralela — Files disjuntos)

### Task 1: Client de lutas — editar luta e trocar vencedor
**Files:** `Front/tournament-jj/src/features/fights/api/fights-client.ts`, `.../fights/api/fights-client.test.ts`, `.../fights/hooks/use-fights.ts`, `Back/src/domain/fight/infra/http/dtos/mark-fight-winner.dto.ts`, `Back/src/domain/fight/infra/http/fight.controller.ts`
**Depends-on:** none
**Produces:** `updateFight(competitionId: string, fightId: string, payload: UpdateFightPayload)`; `overrideFightWinner(competitionId: string, fightId: string, payload: { winnerId: string; winType: string })`; hook `useOverrideFightWinner(competitionId: string | null)` com mesma invalidação de `useFinishFight`.

Testes (fights-client.test.ts, mock de `apiFetch`):
1. `updateFight('7','55',{round:2, order:null, areaId:'3', athleteAId:'10', athleteBId:'11', categoryId:'9'})` chama `PATCH /competitions/7/fights/55` com body `{round:2, areaId:3, athleteAId:10, athleteBId:11}` — sem `order:null` (o zod do back faz coerce de null→0 e rejeita) e sem chaves que o back não aceita. Mapear só `athleteAId, athleteBId, round, order, areaId, status`; omitir `round`/`order` nulos; ids numéricos.
2. `overrideFightWinner('7','55',{winnerId:'10', winType:'SUBMISSION'})` chama `PATCH /competitions/7/fights/55/winner` com `{winnerId:10, winType:'SUBMISSION'}`.

Back: `MarkFightWinnerSchema` ganha `winType: z.string().trim().min(1).optional()`; controller repassa `winType: body.winType` (o use case já aceita `winType`). Rodar specs existentes do fight no Back.
Remover `allowOverride` de `FinishFightPayload`/`finishFight` (o back ignora) — o Task 2 passa a usar `overrideFightWinner`.

### Task 3: Chaves — rota de membros e botão "Remover"
**Files:** `.../key-groups/api/key-groups-client.ts`, `.../key-groups/api/key-groups-client.test.ts`, `.../key-groups/components/key-groups-page.tsx`, `.../key-groups/lib/key-group-rules.ts` (novo), `.../key-groups/lib/key-group-rules.test.ts` (novo)
**Depends-on:** none
Testes:
1. `addAthleteToKeyGroup('4','12')` → `POST /key-groups/4/members/12`; `removeAthleteFromKeyGroup` → `DELETE /key-groups/4/members/12`.
2. `canEditKeyGroupMembers({locked:false, fights:[]})` true; `{locked:true, fights:[]}` false; `{locked:false, fights:[algumaLuta]}` false (back: "Cannot change athletes after fights have already been generated").
Uso: botão "Remover" em `key-groups-page.tsx:450` → `disabled={!canEditKeyGroupMembers(group) || removeAthleteMutation.isPending}`.

### Task 4: Categorias — "Gerar lutas" no modo Chaves
**Files:** `.../competitions/lib/competition-flow.ts`, `.../competitions/lib/competition-flow.test.ts` (novo se não existir), `.../categories/components/categories-page.tsx`
**Depends-on:** none
Teste: `supportsCompetitionWideFightGeneration('KEYS') === false`; para os demais modos (`CBJJ`, e qualquer outro de `CompetitionMode`) `true`.
Uso: em `categories-page.tsx:~333` adicionar `activeCompetitionMode !== null && !supportsCompetitionWideFightGeneration(activeCompetitionMode)` ao `disabled`, e quando for KEYS mostrar texto curto perto do botão: "No modo Chaves as lutas são geradas em cada chave." (o back responde "Competitions in KEYS mode must generate fights per key group").

### Task 5: Sessão — logout limpa cache e 401 derruba a sessão
**Files:** `Front/tournament-jj/src/shared/api/fetch-client.ts`, `.../shared/api/fetch-client.test.ts` (novo), `.../features/auth/lib/end-session.ts` (novo), `.../features/auth/lib/end-session.test.ts` (novo), `Front/tournament-jj/src/app/(admin)/layout.tsx`
**Depends-on:** none
**Produces:** `setUnauthorizedHandler(handler: (() => void) | null)` em fetch-client; `endSession(queryClient: QueryClient)` em end-session.ts.
Testes:
1. fetch-client: com handler registrado e `fetch` mockado devolvendo 401, `apiFetch` chama o handler uma vez e ainda lança `ApiError` status 401. Com 403/500 não chama. Sem token salvo (ex.: tela de login, credencial errada) **não** chama.
2. end-session: chama `useAuthStore.getState().clearSession`, `useCompetitionStore.getState().clearActiveCompetitionId`, `queryClient.clear()` e remove `AUTH_TOKEN_STORAGE_KEY` do localStorage.
Uso no layout: `handleLogout` vira `endSession(queryClient); router.replace('/login')` (`useQueryClient()`); `useEffect` registra `setUnauthorizedHandler(() => { endSession(queryClient); router.replace('/login'); })` e desregistra (`null`) no cleanup.

### Task 6: Pesagem — remover "Categoria" falsa, travar duplo reset, margem padrão 0
**Files:** `.../weighin/components/weighin-tab.tsx`, `.../competitions/types/competition.ts`, `.../competitions/types/competition.test.ts` (novo se não existir)
**Depends-on:** none
Teste: `normalizeCompetition({ id: 1, name: 'X', mode: 'CBJJ' })` (sem `weighInMarginGrams`) → `weighInMarginGrams === 0` (regulamento: "Não haverá tolerância de peso"). Com `weighInMarginGrams: 200` → 200.
Correção: `?? 500` → `?? 0`. Em weighin-tab: remover `categoryFilter` (state, select, filtro no useMemo), coluna `<TableHead>Categoria</TableHead>`/célula e `getCategoryLabel`; botão "Resetar" ganha `disabled={resetMutation.isPending}`. (Remoção de UI: verificada por tsc/lint + teste existente, sem teste novo.)

### Task 7: Importação CSV — aceitar arquivo do Excel pt-BR (Windows-1252)
**Files:** `.../imports/lib/read-csv-file.ts` (novo), `.../imports/lib/read-csv-file.test.ts` (novo), `.../imports/components/import-athletes-page.tsx`
**Depends-on:** none
**Produces:** `readCsvFile(file: File): Promise<{ text: string; utf8File: File }>` — decodifica com `new TextDecoder('utf-8', { fatal: true })`; se lançar, usa `new TextDecoder('windows-1252')`; remove BOM; `utf8File` = `new File([text], file.name, { type: 'text/csv' })` (o back faz `buffer.toString('utf-8')`).
Testes: bytes UTF-8 de "José Conceição" → texto igual; bytes Windows-1252 (`Uint8Array` com 0xE9, 0xE7, 0xE3) → "José Conceição"; BOM UTF-8 removido; `utf8File` relido como UTF-8 dá o mesmo texto.
Uso: `handlePreview` usa `text`; o import envia `utf8File` no lugar do arquivo cru.

### Task 8 (Back): mover uma luta para outra área
**Files:** `Back/src/domain/area/application/use-cases/move-fight-area.use-case.ts` (novo), `.../move-fight-area.use-case.spec.ts` (novo), `Back/src/domain/area/infra/http/dtos/move-fight-area.dto.ts` (novo), `Back/src/domain/area/infra/http/area.controller.ts`, `Back/src/domain/area/area.module.ts`
**Depends-on:** none
**Produces:** `PATCH /competitions/:id/areas/distribution/fights/:fightId` body `{ toAreaId: number; orderIndex?: number }` → `{ data: { areas: AreaQueueView[] }, error: null }` (origem e destino).
Modelo: copiar a estrutura de `move-key-group-area-distribution.use-case.ts` (+ spec) trocando "chave inteira" por "uma luta".
Regras (cada uma com teste no spec, usando fakes em `Back/test/repositories/in-memory` quando existirem):
1. Luta de outra competição / inexistente → NotFoundError.
2. Área destino de outra competição → ValidationError.
3. Só `PENDING` pode mover (CALLED/IN_PROGRESS/FINISHED/CANCELED → ValidationError "Só é possível mover luta pendente").
4. Luta precisa estar na fila de alguma área; destino = mesma área → ValidationError.
5. Sucesso: sai da fila origem (posições renumeradas 1..n), entra na fila destino em `orderIndex` (padrão: fim), `fight.areaId` = destino (`fightRepository.assignAreas`), publica `queue.updated` com as duas áreas.
Registrar use case no `area.module.ts` e rota no controller com `@CompetitionAccess({ type: 'competition', param: 'id' })`.

---

## Onda 2

### Task 2: Tela de lutas — trocar vencedor e formulário com 2 atletas
**Files:** `.../fights/components/fights-tab.tsx`, `.../fights/components/fight-form-dialog.tsx`, `.../fights/lib/fight-form-rules.ts` (novo), `.../fights/lib/fight-form-rules.test.ts` (novo)
**Depends-on:** Task 1
Testes: `canSubmitFightForm({athleteAId:'1', athleteBId:''})` false; `('', '')` false; `('1','1')` false; `('1','2')` true.
Uso: `fight-form-dialog.tsx:257` usa `!canSubmitFightForm(form)`. Em `fights-tab.tsx`: os dois botões "Finalizar" (`~1361`, `~1790`) ficam habilitados para `FINISHED` com rótulo "Trocar vencedor"; `handleFinishFight` com luta `FINISHED` mantém o `window.confirm` e chama `useOverrideFightWinner(...).mutateAsync({ fightId, payload: { winnerId, winType } })` em vez de `finishMutation`. Remover a variável `allowOverride`. `useUpdateFight` passa `competitionId` para `updateFight`.

### Task 9: Tela de distribuição — arrastar luta entre áreas
**Files:** `.../areas/api/areas-client.ts`, `.../areas/api/areas-client.test.ts` (novo se não existir), `.../areas/hooks/use-areas.ts`, `.../areas/components/areas-distribution-page.tsx`, `.../areas/lib/fight-drag.ts` (novo), `.../areas/lib/fight-drag.test.ts` (novo)
**Depends-on:** Task 8
**Produces:** `moveFightToArea(competitionId: string, fightId: string, payload: { toAreaId: string; orderIndex?: number })`, hook `useMoveFightToArea(competitionId)` (invalida as mesmas chaves de `useDistributeFightsFull`).
Testes:
1. client → `PATCH /competitions/7/areas/distribution/fights/55` body `{toAreaId: 3}`.
2. `fight-drag.ts`: `buildFightDragPayload(fightId, fromAreaId)` / `readFightDragPayload(dataTransferText)` (JSON); `resolveFightDrop(payload, toAreaId)` → `null` quando `toAreaId === fromAreaId` ou payload inválido; senão `{ fightId, toAreaId }`. `isFightDraggable(status)` só `PENDING`.
Uso: `FightAllocationCard` recebe `areaId`; `draggable={isFightDraggable(fight.status)}` + `onDragStart` grava payload em `dataTransfer` (`text/plain`); container da área: `onDrop` lê, chama `resolveFightDrop`, dispara mutation, toast de sucesso ("Luta movida para <área>") e erro (mensagem do back). Card não-arrastável sem cursor de arrasto.

---

## Fechamento
- `cd Front/tournament-jj && yarn check:fast && npx vitest run`
- `cd Back && npx tsc --noEmit && npx vitest run src/domain/area src/domain/fight`
- Validar no navegador (Playwright + Chrome, ver memória `project-validacao-e2e-chrome`): editar luta, trocar vencedor, arrastar luta.
