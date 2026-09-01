import { describe, expect, it } from 'vitest';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FourAthleteOlympicBracketFightGenerationStrategy } from '@/domain/key-group/application/strategies/four-athlete-olympic-bracket-fight-generation.strategy';
import { KeysFightGenerationStrategy } from '@/domain/key-group/application/strategies/keys-fight-generation.strategy';
import { makeAthlete } from '../../../../../test/factories/athlete.factory';
import { makeCategory } from '../../../../../test/factories/category.factory';
import { makeCompetition } from '../../../../../test/factories/competition.factory';
import {
  InMemoryAthleteRepository,
  InMemoryCategoryRepository,
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
} from '../../../../../test/repositories/in-memory';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightGenerationResult } from '../strategies/fight-generation.strategy';
import { FightGenerationStrategyResolverService } from '../services/fight-generation-strategy-resolver.service';
import { AbsoluteGpFightGenerationStrategy } from '../strategies/absolute-gp-fight-generation.strategy';
import { CbjjFightGenerationStrategy } from '../strategies/cbjj-fight-generation.strategy';
import { GenerateFightsUseCase } from './generate-fights.use-case';


function setup(mode: CompetitionMode, athletesPerCategory: number[]) {
  const competition = makeCompetition({ id: 1, mode });
  const categories = athletesPerCategory.map((_, index) =>
    makeCategory({ id: index + 1, competitionId: 1, name: `Categoria ${index + 1}` }),
  );

  let nextAthleteId = 1;
  const athletes: Athlete[] = [];
  const links: Array<{ categoryId: number; athleteId: number }> = [];
  for (const [index, total] of athletesPerCategory.entries()) {
    for (let seat = 0; seat < total; seat += 1) {
      const athleteId = nextAthleteId++;
      athletes.push(makeAthlete({ id: athleteId }));
      links.push({ categoryId: index + 1, athleteId });
    }
  }

  const fightRepository = new InMemoryFightRepository();
  const useCase = new GenerateFightsUseCase(
    new InMemoryCompetitionRepository([competition]),
    new InMemoryCategoryRepository(categories, links),
    new InMemoryAthleteRepository(athletes),
    fightRepository,
    new FightGenerationStrategyResolverService(
      new AbsoluteGpFightGenerationStrategy(),
      new KeysFightGenerationStrategy(
        new FourAthleteOlympicBracketFightGenerationStrategy(),
      ),
      new CbjjFightGenerationStrategy(),
    ),
  );

  return { useCase, fightRepository };
}

describe('GenerateFightsUseCase', () => {
  it('keeps a best-of-three category unlinked while a bracket category in the same competition gets its links', async () => {
    const { useCase, fightRepository } = setup(CompetitionMode.CBJJ, [2, 4]);

    await useCase.execute(1);

    const stored = await fightRepository.listByCompetitionId({ competitionId: 1 });
    const bestOfThree = stored.filter((fight) => fight.categoryId === 1);
    const bracket = stored.filter((fight) => fight.categoryId === 2);

    // Melhor de tres nao avanca: a terceira luta so nasce se ficar 1x1.
    expect(bestOfThree).toHaveLength(2);
    expect(bestOfThree.every((fight) => fight.nextFightId === null)).toBe(true);

    // Chave de 4: as duas semis avancam para a final e mandam o perdedor para
    // a disputa de terceiro.
    const semifinals = bracket.filter((fight) => fight.round === 1);
    expect(semifinals).toHaveLength(2);
    expect(semifinals.every((fight) => fight.nextFightId !== null)).toBe(true);
    expect(semifinals.every((fight) => fight.loserNextFightId !== null)).toBe(true);
  });

  it('still infers round-by-round links for strategies that do not declare them', async () => {
    // AbsoluteGp nao devolve a chave `links`, entao segue no encadeamento padrao.
    const { useCase, fightRepository } = setup(CompetitionMode.ABSOLUTE_GP, [4]);

    await useCase.execute(1);

    const stored = await fightRepository.listByCompetitionId({ competitionId: 1 });
    const firstRound = stored.filter((fight) => fight.round === 1);
    const final = stored.find((fight) => fight.round === 2);

    expect(firstRound).toHaveLength(2);
    expect(final).toBeDefined();
    expect(firstRound.map((fight) => fight.nextFightId)).toEqual([
      final?.id,
      final?.id,
    ]);
    expect(firstRound.map((fight) => fight.nextFightSlot).sort()).toEqual(['A', 'B']);
  });

  it('does not infer links for a strategy that declares an empty link plan', async () => {
    // Contrato do tipo FightGenerationResult: `links` ausente = "encadeie por
    // rodada"; `links` presente, ainda que vazio = "esta categoria nao tem
    // avanco". As duas categorias abaixo tem lutas em duas rodadas, e so a
    // segunda pode ser encadeada.
    const twoRoundFights = (categoryId: number) => [
      FightEntity.create({
        competitionId: 1, categoryId, keyGroupId: null, round: 1, order: 1,
        areaId: null, areaName: null, athleteAId: 10, athleteBId: 20,
      }),
      FightEntity.create({
        competitionId: 1, categoryId, keyGroupId: null, round: 2, order: 2,
        areaId: null, areaName: null, athleteAId: null, athleteBId: null,
      }),
    ];

    const resolver = {
      resolve: () => ({
        mode: CompetitionMode.CBJJ,
        generate: ({ categoryId }: { categoryId: number }): FightGenerationResult => ({
          fights: twoRoundFights(categoryId),
          metadata: [],
          // categoria 1 declara plano vazio; categoria 2 nao declara nada
          ...(categoryId === 1 ? { links: [] } : {}),
        }),
      }),
    };

    const competition = makeCompetition({ id: 1, mode: CompetitionMode.CBJJ });
    const fightRepository = new InMemoryFightRepository();
    const useCase = new GenerateFightsUseCase(
      new InMemoryCompetitionRepository([competition]),
      new InMemoryCategoryRepository(
        [makeCategory({ id: 1, competitionId: 1 }), makeCategory({ id: 2, competitionId: 1 })],
        [{ categoryId: 1, athleteId: 10 }, { categoryId: 2, athleteId: 20 }],
      ),
      new InMemoryAthleteRepository([makeAthlete({ id: 10 }), makeAthlete({ id: 20 })]),
      fightRepository,
      resolver as unknown as FightGenerationStrategyResolverService,
    );

    await useCase.execute(1);

    const stored = await fightRepository.listByCompetitionId({ competitionId: 1 });
    const declaredEmpty = stored.find((fight) => fight.categoryId === 1 && fight.round === 1);
    const inferred = stored.find((fight) => fight.categoryId === 2 && fight.round === 1);
    const inferredTarget = stored.find((fight) => fight.categoryId === 2 && fight.round === 2);

    expect(declaredEmpty?.nextFightId).toBeNull();
    expect(inferred?.nextFightId).toBe(inferredTarget?.id);
  });
});
