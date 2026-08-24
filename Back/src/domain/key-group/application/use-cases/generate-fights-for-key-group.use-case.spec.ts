import { beforeEach, describe, expect, it } from 'vitest';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightGenerationStrategyResolverService } from '@/domain/fight/application/services/fight-generation-strategy-resolver.service';
import { AbsoluteGpFightGenerationStrategy } from '@/domain/fight/application/strategies/absolute-gp-fight-generation.strategy';
import { makeCompetition } from '../../../../../test/factories';
import {
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
  InMemoryKeyGroupRepository,
} from '../../../../../test/repositories/in-memory';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { KeyGroupMember } from '../../domain/entities/key-group-member.entity';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { FourAthleteOlympicBracketFightGenerationStrategy } from '../strategies/four-athlete-olympic-bracket-fight-generation.strategy';
import { KeysFightGenerationStrategy } from '../strategies/keys-fight-generation.strategy';
import { GenerateFightsForKeyGroupUseCase } from './generate-fights-for-key-group.use-case';

class DistributeAreaFightsUseCaseStub {
  public calls: unknown[] = [];

  async execute(input: unknown): Promise<void> {
    this.calls.push(input);
  }
}

function makeGroup(id: number) {
  return KeyGroup.restore({
    id,
    competitionId: 1,
    categoryId: 10,
    name: 'Chave A',
    status: KeyGroupStatus.READY,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
}

function makeMember(input: { id: number; keyGroupId: number; athleteId: number }) {
  return KeyGroupMember.restore({
    id: input.id,
    keyGroupId: input.keyGroupId,
    athleteId: input.athleteId,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
}

describe('GenerateFightsForKeyGroupUseCase', () => {
  let fightRepository: InMemoryFightRepository;
  let distributeAreaFightsUseCase: DistributeAreaFightsUseCaseStub;
  let useCase: GenerateFightsForKeyGroupUseCase;

  beforeEach(() => {
    fightRepository = new InMemoryFightRepository();
    distributeAreaFightsUseCase = new DistributeAreaFightsUseCaseStub();
    useCase = new GenerateFightsForKeyGroupUseCase(
      new InMemoryCompetitionRepository([
        makeCompetition({ id: 1, mode: CompetitionMode.KEYS }),
      ]),
      new InMemoryKeyGroupRepository(
        [makeGroup(20)],
        [
          makeMember({ id: 1, keyGroupId: 20, athleteId: 101 }),
          makeMember({ id: 2, keyGroupId: 20, athleteId: 102 }),
        ],
      ),
      fightRepository,
      new FightGenerationStrategyResolverService(
        new AbsoluteGpFightGenerationStrategy(),
        new KeysFightGenerationStrategy(
          new FourAthleteOlympicBracketFightGenerationStrategy(),
        ),
      ),
      distributeAreaFightsUseCase as any,
    );
  });

  it('generates two active persisted fights for a two-athlete best-of-three key group', async () => {
    const result = await useCase.execute(20);

    expect(result.metadata).toEqual([
      expect.objectContaining({
        categoryId: 10,
        format: 'BEST_OF_THREE',
      }),
    ]);
    expect(result.fights).toHaveLength(2);
    expect(result.fights).toEqual([
      expect.objectContaining({
        keyGroupId: 20,
        athleteAId: 101,
        athleteBId: 102,
        orderIndex: 1,
      }),
      expect.objectContaining({
        keyGroupId: 20,
        athleteAId: 101,
        athleteBId: 102,
        orderIndex: 2,
      }),
    ]);
    const [firstFight, secondFight] = result.fights;
    expect(distributeAreaFightsUseCase.calls).toEqual([
      expect.objectContaining({
        competitionId: 1,
        fightIds: [firstFight.id, secondFight.id],
      }),
    ]);
  });
});
