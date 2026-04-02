import { Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightGenerationResult, FightGenerationStrategy } from '@/domain/fight/application/strategies/fight-generation.strategy';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';

export type FourAthleteOlympicBracketFightGenerationInput = {
  competitionId: number;
  keyGroupId: number;
  categoryId: number | null;
  athleteIds: [number, number, number, number];
};

@Injectable()
export class FourAthleteOlympicBracketFightGenerationStrategy
  implements FightGenerationStrategy<FourAthleteOlympicBracketFightGenerationInput>
{
  readonly mode = CompetitionMode.KEYS;

  generate(
    input: FourAthleteOlympicBracketFightGenerationInput,
  ): FightGenerationResult {
    const [seed1, seed2, seed3, seed4] = input.athleteIds;

    return {
      fights: [
        FightEntity.create({
          competitionId: input.competitionId,
          categoryId: input.categoryId,
          keyGroupId: input.keyGroupId,
          areaId: null,
          athleteAId: seed1,
          athleteBId: seed4,
          orderIndex: 1,
        }),
        FightEntity.create({
          competitionId: input.competitionId,
          categoryId: input.categoryId,
          keyGroupId: input.keyGroupId,
          areaId: null,
          athleteAId: seed2,
          athleteBId: seed3,
          orderIndex: 2,
        }),
      ],
      metadata: [
        {
          categoryId: input.categoryId,
          format: 'OLYMPIC_BRACKET',
          notes: [
            `Key group ${input.keyGroupId} generated as a 4-athlete olympic bracket`,
            'Fight 1: seed 1 vs seed 4',
            'Fight 2: seed 2 vs seed 3',
            'Final: winners of fights 1 and 2',
            'Third place: losers of fights 1 and 2',
          ],
        },
      ],
    };
  }
}
