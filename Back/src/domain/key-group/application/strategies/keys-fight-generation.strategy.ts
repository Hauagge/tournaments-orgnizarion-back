import { Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightGenerationResult, FightGenerationStrategy } from '@/domain/fight/application/strategies/fight-generation.strategy';
import { FourAthleteOlympicBracketFightGenerationStrategy } from './four-athlete-olympic-bracket-fight-generation.strategy';

export type KeysFightGenerationInput = {
  competitionId: number;
  keyGroupId: number;
  categoryId: number | null;
  athleteIds: number[];
};

@Injectable()
export class KeysFightGenerationStrategy
  implements FightGenerationStrategy<KeysFightGenerationInput>
{
  readonly mode = CompetitionMode.KEYS;

  constructor(
    private readonly fourAthleteOlympicBracketStrategy: FourAthleteOlympicBracketFightGenerationStrategy,
  ) {}

  generate(input: KeysFightGenerationInput): FightGenerationResult {
    const athleteIds = [...new Set(input.athleteIds)];

    if (athleteIds.length < 2) {
      return {
        fights: [],
        metadata: [],
      };
    }

    if (athleteIds.length === 4) {
      return this.fourAthleteOlympicBracketStrategy.generate({
        competitionId: input.competitionId,
        keyGroupId: input.keyGroupId,
        categoryId: input.categoryId,
        athleteIds: athleteIds as [number, number, number, number],
      });
    }

    const fights: FightEntity[] = [];
    let orderIndex = 1;

    for (let index = 0; index < athleteIds.length; index++) {
      for (let nextIndex = index + 1; nextIndex < athleteIds.length; nextIndex++) {
        fights.push(
          FightEntity.create({
            competitionId: input.competitionId,
            categoryId: input.categoryId,
            keyGroupId: input.keyGroupId,
            areaId: null,
            athleteAId: athleteIds[index],
            athleteBId: athleteIds[nextIndex],
            orderIndex: orderIndex++,
          }),
        );
      }
    }

    return {
      fights,
      metadata: [
        {
          categoryId: input.categoryId,
          format: 'ROUND_ROBIN',
          notes: [`Key group ${input.keyGroupId} generated with ${athleteIds.length} athletes`],
        },
      ],
    };
  }
}
