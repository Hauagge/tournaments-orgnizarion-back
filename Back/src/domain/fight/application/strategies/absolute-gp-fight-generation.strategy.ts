import { Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightGenerationResult, FightGenerationStrategy } from './fight-generation.strategy';

export type AbsoluteGpFightGenerationInput = {
  competitionId: number;
  categoryId: number;
  athletes: Athlete[];
};

@Injectable()
export class AbsoluteGpFightGenerationStrategy
  implements FightGenerationStrategy<AbsoluteGpFightGenerationInput>
{
  readonly mode = CompetitionMode.ABSOLUTE_GP;

  generate(input: AbsoluteGpFightGenerationInput): FightGenerationResult {
    const athleteIds = input.athletes
      .map((athlete) => athlete.id)
      .filter((id): id is number => id !== undefined);

    if (athleteIds.length < 2) {
      return {
        fights: [],
        metadata: [],
      };
    }

    if (athleteIds.length === 2) {
      const [athleteAId, athleteBId] = athleteIds;

      return {
        fights: [1, 2, 3].map((orderIndex) =>
          FightEntity.create({
            competitionId: input.competitionId,
            categoryId: input.categoryId,
            keyGroupId: null,
            areaId: null,
            athleteAId,
            athleteBId,
            orderIndex,
          }),
        ),
        metadata: [
          {
            categoryId: input.categoryId,
            format: 'BEST_OF_THREE',
          },
        ],
      };
    }

    if (athleteIds.length === 3) {
      const pairs: Array<[number, number]> = [
        [athleteIds[0], athleteIds[1]],
        [athleteIds[0], athleteIds[2]],
        [athleteIds[1], athleteIds[2]],
      ];

      return {
        fights: pairs.map(([athleteAId, athleteBId], index) =>
          FightEntity.create({
            competitionId: input.competitionId,
            categoryId: input.categoryId,
            keyGroupId: null,
            areaId: null,
            athleteAId,
            athleteBId,
            orderIndex: index + 1,
          }),
        ),
        metadata: [
          {
            categoryId: input.categoryId,
            format: 'ROUND_ROBIN',
            notes: ['Use tiebreak metadata when athletes finish tied on wins'],
          },
        ],
      };
    }

    const fights: FightEntity[] = [];
    let orderIndex = 1;
    for (let index = 0; index < athleteIds.length - 1; index += 2) {
      const athleteAId = athleteIds[index];
      const athleteBId = athleteIds[index + 1];

      if (athleteBId === undefined) {
        break;
      }

      fights.push(
        FightEntity.create({
          competitionId: input.competitionId,
          categoryId: input.categoryId,
          keyGroupId: null,
          areaId: null,
          athleteAId,
          athleteBId,
          orderIndex: orderIndex++,
        }),
      );
    }

    return {
      fights,
      metadata: [
        {
          categoryId: input.categoryId,
          format: 'OLYMPIC_BRACKET',
          notes: ['Initial round generated for olympic bracket progression'],
        },
      ],
    };
  }
}
