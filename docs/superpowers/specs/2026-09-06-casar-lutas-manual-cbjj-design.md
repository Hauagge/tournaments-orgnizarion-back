# Casar lutas no dia do campeonato — luta manual sem bloqueio, com confirmação

Data: 2026-09-06
Status: aprovado para planejamento

## Problema

No dia do campeonato aparece o caso que nenhuma chave prevista resolve: um
atleta ficou sozinho na categoria, alguém não bateu o peso, dois competidores
querem uma revanche. O coordenador precisa montar a luta na hora, na mesa,
com o professor esperando ao lado.

Hoje o sistema recusa quase todas essas montagens. As recusas são corretas
para a geração automática de chaves e erradas para a decisão humana feita na
mesa: o operador já sabe o que está fazendo, e o sistema devolve um erro seco
que não explica nem oferece saída.

## Decisão

Separar os dois caminhos:

- **Geração automática de lutas fica exatamente como está.** `GenerateFightsUseCase`
  e `GenerateFightsForKeyGroupUseCase` seguem restritos a `KEYS` e de 2 a 4
  atletas. Nenhuma linha muda nesses arquivos.
- **A criação manual de luta perde os bloqueios de negócio.** Em troca, ela
  passa a exigir confirmação explícita e mostra os avisos que importam.

O princípio: o sistema informa, o humano decide. Nada é gravado sem uma
confirmação que passou pela tela.

## Regulamento aplicável

`Front/Criterios.txt`, reunião 28/03, seção "Chave Manual":

- máximo de 4 atletas por chave;
- separação por idade e faixa, permitida a mescla entre `BRANCA+CINZA`,
  `AMARELA`, `LARANJA`, `VERDE`;
- depois separado por peso;
- tabela de peso IBJJ.

O limite de 4 permanece **na geração automática**, que é onde o regulamento o
exige. A composição da chave e a criação manual de luta deixam de o impor,
porque são atos do coordenador, não do gerador.

A mescla de faixa **não** vira bloqueio: o construtor de chaves já filtra por
faixa e a mescla já é configurada por competição em
`Front/tournament-jj/src/features/competitions/components/competition-form.tsx:34`.

## Escopo

### 1. Bloqueios removidos da criação manual de luta

| Bloqueio | Arquivo:linha | Vira |
| --- | --- | --- |
| Atletas fora da categoria informada | `create-manual-fight.use-case.ts:63` | livre |
| Já existe luta ativa entre os dois | `create-manual-fight.use-case.ts:87` | livre |
| `competition.mode !== KEYS` | `create-fight-for-key-group.use-case.ts:59` | livre |
| Os dois precisam ser membros da chave | `create-fight-for-key-group.use-case.ts:70` | livre |
| Chave ainda em `DRAFT` | `create-fight-for-key-group.use-case.ts:45` | livre |

### 2. Bloqueios que permanecem

Não são regra de negócio, são dado inválido — passar por cima produz registro
corrompido, não uma decisão de arbitragem:

- atleta A igual ao atleta B (`create-manual-fight.use-case.ts:33`,
  `create-fight-for-key-group.use-case.ts:35`);
- atleta ou chave inexistente;
- atleta de outra competição (`create-manual-fight.use-case.ts:50`).

### 3. O aviso

Serviço novo, compartilhado pelos dois use cases:

`Back/src/domain/fight/application/services/manual-fight-warnings.service.ts`

Para cada um dos dois atletas: busca a chave dele na competição
(`IKeyGroupRepository.findByCompetitionIdAndAthleteId`) e, se essa chave tiver
alguma luta com status diferente de `CANCELED`
(`IFightRepository.listByKeyGroupId`), emite um aviso.

Formato do aviso:

```json
{
  "code": "ATHLETE_IN_KEY_GROUP_WITH_FIGHTS",
  "athleteId": 42,
  "athleteName": "João Silva",
  "keyGroupId": 7,
  "keyGroupName": "Chave B",
  "generatedFightsCount": 3
}
```

Nenhum outro aviso entra nesta versão.

### 4. A confirmação

Ambas as rotas de criação manual ganham `confirmed?: boolean` no body:

- `POST /competitions/:id/fights/manual`
- `POST /key-groups/:id/fights`

Comportamento:

- **sem `confirmed`** e havendo ao menos um aviso → responde `409 Conflict`
  com a lista de avisos. Nada é gravado.
- **sem `confirmed`** e sem nenhum aviso → executa direto. Não faz sentido
  abrir diálogo para dizer que está tudo certo.
- **com `confirmed: true`** → executa, independentemente dos avisos.

O backend é a única fonte dos avisos. Isso mantém a confirmação garantida por
contrato: quem chamar a API por fora também recebe o `409`.

### 5. Composição da chave

`CreateKeyGroupUseCase`:

- `create-key-group.use-case.ts:42` — aceitar `KEYS` **e** `CBJJ`.
  `ABSOLUTE_GP` segue bloqueado, tem fluxo próprio.

`AddMemberToKeyGroupUseCase`:

- `add-member-to-key-group.use-case.ts:61` — o teto de 4 atletas **permanece
  para competição `KEYS`** (é o tamanho que a geração automática exige). Só
  cai para `CBJJ`, que não tem esse limite. Como o use case hoje não carrega a
  competição, precisa buscar `competition.mode` (via `group.competitionId`) e
  só aplicar o `throw` quando `mode === KEYS`.
- `add-member-to-key-group.use-case.ts:65` — atleta já em outra chave deixa de
  ser erro. Sem `confirmMove`, responde `409` nomeando a chave de origem. Com
  `confirmMove: true`, executa o movimento.

Semântica do movimento, numa transação:

1. remove o atleta da chave de origem;
2. adiciona na chave de destino;
3. **se a chave de origem ficar sem nenhum membro, ela é excluída**;
4. se sobrar pelo menos um membro, a chave de origem é mantida e tem o status
   recalculado (`markDraft()` quando cair para menos de 2 membros).

Permanecem duros, porque desfazê-los destruiria resultado já registrado. A
resposta explica o motivo e **não** oferece confirmação:

| Guarda | Situação hoje |
| --- | --- |
| Chave de **destino** `LOCKED` | já existe, `add-member-to-key-group.use-case.ts:41` |
| Chave de **destino** com lutas não canceladas | já existe, `add-member-to-key-group.use-case.ts:71` |
| Chave de **origem** `LOCKED` | **não existe, precisa ser criada** |
| Chave de **origem** com lutas não canceladas | **não existe, precisa ser criada** |

Atenção: as duas guardas existentes olham para `group`, que é sempre a chave de
**destino** (`listByKeyGroupId(group.id)`). Nenhuma delas protege a chave de
origem, porque hoje o movimento simplesmente não acontece. As duas guardas de
origem são código novo.

## Lacunas técnicas a resolver

Três coisas que a implementação precisa antes de funcionar:

1. **Não existe erro `409` no projeto.** `shared/errors/` só tem
   `validation.error.ts` (400) e `not-found.error.ts` (404). Criar
   `shared/errors/conflict.error.ts` no mesmo formato, com
   `code: 'CONFIRMATION_REQUIRED'`, `HttpStatus.CONFLICT` e os avisos em
   `details`.
2. **`IKeyGroupRepository` não sabe excluir chave.** Adicionar
   `delete(id: number): Promise<void>` à interface e à implementação TypeORM.
3. **`IKeyGroupRepository` não tem transação.** Só `FightRepository` tem
   (`fight.repository.ts:248`). Adicionar `withTransaction` seguindo o mesmo
   padrão, para que remover + adicionar + excluir aconteçam de forma atômica.

## Contratos HTTP

### `POST /competitions/:id/fights/manual`

Body ganha `confirmed?: boolean` em `create-manual-fight.dto.ts`.

`409`:

```json
{
  "data": null,
  "error": {
    "code": "CONFIRMATION_REQUIRED",
    "message": "Confirme a criacao da luta",
    "details": { "warnings": [ /* ver secao 3 */ ] }
  }
}
```

### `POST /key-groups/:id/fights`

Mesmo contrato. Body ganha `confirmed?: boolean` em
`create-key-group-fight.dto.ts`.

### `POST /key-groups/:id/members/:athleteId`

Hoje não tem body. Passa a aceitar `{ "confirmMove"?: boolean }`.

`409`:

```json
{
  "data": null,
  "error": {
    "code": "CONFIRMATION_REQUIRED",
    "message": "Atleta ja esta em outra chave",
    "details": {
      "sourceKeyGroupId": 7,
      "sourceKeyGroupName": "Chave B",
      "sourceKeyGroupWillBeDeleted": true
    }
  }
}
```

`sourceKeyGroupWillBeDeleted` é `true` quando a chave de origem tem exatamente
um membro — o que está sendo movido. A tela usa isso para dizer que a chave
some.

## Frontend

`Front/tournament-jj/src/`

- `features/fights/api/fights-client.ts` — `createFight` aceita `confirmed`.
- `features/key-groups/api/key-groups-client.ts` — `addMember` aceita
  `confirmMove`; `createFight` da chave aceita `confirmed`.
- `shared/ui/` — diálogo de confirmação reaproveitável, recebendo título,
  lista de avisos e o callback que reenvia com a flag.
- `features/fights/components/fight-form-dialog.tsx` — trata o `409`, abre o
  diálogo, reenvia com `confirmed: true`.
- `features/key-groups/components/key-group-builder.tsx` — `maxSize` deixa de
  travar o botão de adicionar; acima de 4 mostra aviso, não bloqueio. Trata o
  `409` do movimento de atleta.

Nenhuma tela nova. O construtor de chaves já lista por padrão só os atletas que
não estão em nenhuma chave (`key-group-builder.tsx:80`), que é exatamente a
lista de quem precisa ser casado.

## Testes

Escritos antes da implementação.

Backend, por use case:

- `create-manual-fight`: cria com atletas de categorias diferentes; cria
  confronto repetido; devolve `409` quando há aviso e falta `confirmed`;
  executa direto quando não há aviso; segue recusando atleta igual e atleta de
  outra competição.
- `create-fight-for-key-group`: funciona em competição `CBJJ`; funciona com
  atleta que não é membro; funciona em chave `DRAFT`; mesmo comportamento de
  `409`/`confirmed`.
- `manual-fight-warnings.service`: sem aviso quando o atleta não tem chave;
  sem aviso quando a chave não tem luta; sem aviso quando as lutas da chave
  estão todas canceladas; com aviso e contagem certa no caso positivo.
- `create-key-group`: aceita `CBJJ`; segue recusando `ABSOLUTE_GP`.
- `add-member-to-key-group`: recusa o quinto atleta em competição `KEYS`;
  aceita o quinto atleta em `CBJJ`; devolve `409` sem
  `confirmMove`; move com `confirmMove`; **exclui** a chave de origem quando
  ela fica vazia; **mantém** a chave de origem, em `DRAFT`, quando sobra um
  único atleta; segue recusando destino `LOCKED` e destino com lutas geradas;
  recusa origem `LOCKED` e origem com lutas geradas (guardas novas).

Frontend:

- `fight-form-dialog`: abre o diálogo no `409` e reenvia com `confirmed`.
- `key-group-builder`: não trava acima de 4; mostra o aviso de quantidade;
  abre o diálogo de movimento no `409`.

Regressão obrigatória: a suíte de `generate-fights-for-key-group` e
`generate-fights` precisa passar sem alteração. Se algum teste desses mudar, a
premissa desta spec foi violada.

## Fora de escopo

- Mexer na geração automática de lutas.
- Codificar a mescla de faixa como bloqueio.
- Alterar o fluxo de categoria do modo CBJJ.
- Tela nova de "atletas sem chave".
- Qualquer aviso além do `ATHLETE_IN_KEY_GROUP_WITH_FIGHTS`.

## Dívida registrada

`key-group-builder.tsx` tem 386 linhas e `fights-tab.tsx` tem 1987, ambos acima
do teto de 350. Esta implementação toca nos dois sem refatorá-los. A quebra
fica como tarefa separada.
