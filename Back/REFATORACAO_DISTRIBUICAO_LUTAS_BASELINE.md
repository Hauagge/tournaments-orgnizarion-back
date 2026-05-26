# Baseline de Refatoracao: Centralizacao da Distribuicao de Lutas

## Objetivo

Centralizar a decisao de distribuicao de lutas por area e montagem de fila em um unico motor, eliminando a duplicidade atual entre:

- geracao de lutas por chave com atribuicao imediata de area/fila
- distribuicao posterior em lote

O estado final desejado e:

- geracao de lutas nao decide `areaId`
- um unico fluxo decide `areaId` e `area_queue_items`
- a mesma logica suporta dois modos:
  - `FULL`: recompõe a fila da competicao
  - `INCREMENTAL`: encaixa apenas novas lutas sem desmontar a fila existente

## Problema Atual

Hoje existem dois mecanismos com poder de decidir distribuicao:

1. `GenerateFightsForKeyGroupUseCase`
   - escolhe area por menor fila
   - cria lutas ja com `areaId`
   - cria `area_queue_items` imediatamente

2. `DistributeAreaFightsUseCase`
   - redistribui lutas por estrategia da competicao
   - reatribui `areaId`
   - recria a fila da competicao

Consequencias:

- regra duplicada
- risco de divergencia comportamental
- dependencias desnecessarias entre geracao e operacao de fila
- heuristica local inferior no fluxo por chave
- maior custo de manutencao

## Principios da Refatoracao

1. Uma unica fonte de verdade decide distribuicao.
2. Geracao de luta e distribuicao de luta sao responsabilidades separadas.
3. Planejamento e persistencia nao devem ficar misturados.
4. O sistema precisa suportar operacao ao vivo sem destruir fila desnecessariamente.
5. Lutas de um mesmo `keyGroupId` continuam sendo tratadas como unidade logica.

## Escopo Estrutural

### Componentes a introduzir

1. `FightQueuePlannerService`
   - gera um plano de distribuicao
   - nao persiste
   - suporta `FULL` e `INCREMENTAL`

2. `FightQueueWriterService`
   - aplica o plano no banco
   - encapsula alteracoes em `fights.area_id` e `area_queue_items`

3. `DistributionMode`
   - `FULL`
   - `INCREMENTAL`

4. Tipos de plano
   - assignments
   - queue items
   - diagnostics

### Componentes que devem perder responsabilidade

1. `GenerateFightsForKeyGroupUseCase`
   - deve parar de escolher area
   - deve parar de criar fila

2. `KeyGroupAreaSelectionService`
   - deve ser removido do fluxo principal
   - idealmente eliminado ao final

3. `DistributeAreaFightsUseCase`
   - deve deixar de concentrar toda a logica
   - deve virar orquestrador fino

## Estado Alvo por Comportamento

### Fluxo de geracao por chave

Estado atual:

- gera
- escolhe area
- cria fila

Estado alvo:

- gera
- persiste lutas com `areaId = null`
- opcionalmente dispara distribuicao incremental

### Fluxo de distribuicao em lote

Estado atual:

- distribui
- persiste
- recria fila

Estado alvo:

- carrega contexto
- chama planner
- chama writer
- publica eventos

## Fases

### Fase 1: Extracao do motor central sem quebrar comportamento

Objetivo:

- extrair a logica de planejamento e escrita a partir do fluxo atual em lote

Entregas:

- criar `FightQueuePlannerService`
- criar `FightQueueWriterService`
- manter `DistributeAreaFightsUseCase` funcional usando os novos servicos

Critério de aceite:

- endpoint atual de distribuicao continua funcionando
- resultado funcional do `FULL` permanece equivalente ao comportamento atual

Risco:

- regressao de fila por erro na extracao de posicoes ou assignments

### Fase 2: Introducao explicita de modos `FULL` e `INCREMENTAL`

Objetivo:

- transformar o fluxo central em API de distribuicao de verdade

Entregas:

- criar enum `DistributionMode`
- expandir DTO/controlador para aceitar `mode`
- implementar contrato de planejamento incremental

Critério de aceite:

- `FULL` continua recomponto a fila
- `INCREMENTAL` nao remove fila existente por padrao

Risco:

- comportamento ambiguo se `INCREMENTAL` operar sem universo de lutas bem definido

### Fase 3: Remocao da decisao de area do fluxo por chave

Objetivo:

- eliminar a duplicidade de decisao arquitetural

Entregas:

- remover selecao de area de `GenerateFightsForKeyGroupUseCase`
- remover criacao direta de `area_queue_items` nesse fluxo
- gerar lutas com `areaId = null`

Critério de aceite:

- geracao por chave continua criando lutas corretamente
- nenhuma luta nova recebe area fora do fluxo central

Risco:

- se nao houver distribuicao posterior, as lutas podem ficar operavelmente invisiveis

### Fase 4: Acoplamento operacional refinado

Objetivo:

- manter a centralizacao sem piorar a operacao

Entregas:

- opcao de disparar `INCREMENTAL` automaticamente apos gerar lutas por chave
- diagnosticos do planner para entender impacto por area

Critério de aceite:

- operador continua conseguindo gerar chave e ver lutas entrarem no fluxo operacional
- sem reintroduzir regra duplicada

Risco:

- chamar incremental automaticamente com politica ruim pode baguncar fila viva

### Fase 5: Limpeza final

Objetivo:

- remover codigo legado e consolidar o desenho

Entregas:

- remover `KeyGroupAreaSelectionService`
- revisar modulos e dependencias
- simplificar contratos de repositorio se necessario

Critério de aceite:

- nao existe mais atribuicao de area fora do motor central

## Politicas Operacionais que Precisam Ser Explicitadas

Essas decisoes nao podem ficar implicitas durante a implementacao:

1. Luta `IN_PROGRESS`
   - nao mover

2. Luta `CALLED`
   - por padrao, nao mover
   - excecao so se houver regra explicita

3. Luta `WAITING`
   - pode ser redistribuida

4. Luta `FINISHED`
   - nao volta para fila

5. Luta `CANCELED`
   - nao volta para fila

6. Grupo de chave
   - nao deve ser fragmentado entre areas sem requisito explicito

## Decisoes Tecnicas Fixas

Essas decisoes devem ser tratadas como baseline, salvo revisao consciente:

1. O motor central de distribuicao sera o unico autorizado a decidir `areaId`.
2. `GenerateFightsForKeyGroupUseCase` nao sera mais responsavel por fila.
3. `FULL` e `INCREMENTAL` usarao o mesmo planner, com politicas diferentes.
4. O writer sera o unico ponto de persistencia de queue/assignment.
5. O conceito de `FightQueueGroup` sera preservado como unidade logica.

## Arquivos Prioritarios

### Criar

- `src/domain/area/application/services/fight-queue-planner.service.ts`
- `src/domain/area/application/services/fight-queue-writer.service.ts`
- `src/domain/area/application/value-objects/distribution-mode.enum.ts`
- `src/domain/area/application/types/fight-queue-plan.type.ts`

### Alterar

- `src/domain/area/application/use-cases/distribute-area-fights.use-case.ts`
- `src/domain/area/infra/http/dtos/distribute-area-fights.dto.ts`
- `src/domain/area/infra/http/area.controller.ts`
- `src/domain/area/area.module.ts`
- `src/domain/key-group/application/use-cases/generate-fights-for-key-group.use-case.ts`
- `src/domain/key-group/key-group.module.ts`
- `src/domain/fight/repository/IFightRepository.repository.ts`
- `src/domain/area/repository/IAreaQueueItemRepository.repository.ts`

### Remover ao final

- `src/domain/key-group/application/services/key-group-area-selection.service.ts`

## Fora de Escopo Nesta Refatoracao

1. Redesenho do algoritmo de geracao de lutas
2. Mudanca de modelagem de `FightStatus`
3. Reestruturacao completa de eventos websocket
4. Otimizacao prematura de performance SQL sem necessidade real

## Riscos Reais

1. Criar lutas sem area e esquecer de redistribuir
2. Apagar fila inteira durante evento em andamento
3. Quebrar a coesao de `keyGroupId`
4. Misturar novamente regra de negocio com persistencia
5. Fazer incremental simplista baseado apenas em menor fila

## Antipadroes a Evitar

1. Reaproveitar `KeyGroupAreaSelectionService` como "atalho temporario"
2. Colocar logica de distribuicao nova dentro do controller
3. Fazer `GenerateFightsForKeyGroupUseCase` chamar repositorio de fila diretamente
4. Fazer `INCREMENTAL` depender de heuristica opaca sem diagnostico
5. Reescrever fila em massa sem proteger lutas `CALLED` e `IN_PROGRESS`

## Checklist de Conclusao

- [ ] Existe um unico motor central de distribuicao
- [ ] Existe separacao entre planner e writer
- [ ] O fluxo por chave nao decide mais `areaId`
- [ ] O sistema suporta `FULL`
- [ ] O sistema suporta `INCREMENTAL`
- [ ] A fila preserva grupos logicos
- [ ] Lutas operacionais nao sao movidas indevidamente
- [ ] `KeyGroupAreaSelectionService` foi removido
- [ ] Testes cobrem o fluxo central

## Regra de Foco Durante a Execucao

Sempre que houver desvio de escopo, voltar para esta pergunta:

"Esta mudanca aproxima o sistema do estado em que apenas o motor central decide distribuicao e fila?"

Se a resposta for nao, a mudanca deve ser adiada, removida ou isolada.
