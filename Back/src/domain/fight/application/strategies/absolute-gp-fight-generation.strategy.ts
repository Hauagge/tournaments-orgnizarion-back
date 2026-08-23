import { Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightEntity } from '../../domain/entities/fight.entity';
import {
  FightGenerationResult,
  FightGenerationStrategy,
} from './fight-generation.strategy';

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

    const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(2, athleteIds.length)));
    const rounds = Math.log2(bracketSize);
    const byesCount = bracketSize - athleteIds.length;
    const remainingAthletes = [...athleteIds];
    const seededPairs: (number | null)[][] = [];

    for (let i = 0; i < byesCount; i += 1) {
      seededPairs.push([remainingAthletes.shift() ?? null, null]);
    }
    while (remainingAthletes.length > 0) {
      seededPairs.push([
        remainingAthletes.shift() ?? null,
        remainingAthletes.shift() ?? null,
      ]);
    }

    const seededAthletes = seededPairs.flat();

    const fights: FightEntity[] = [];
    let order = 1;

    for (let round = 1; round <= rounds; round += 1) {
      const fightsInRound = bracketSize / 2 ** round;

      for (let index = 0; index < fightsInRound; index += 1) {
        fights.push(
          FightEntity.create({
            competitionId: input.competitionId,
            categoryId: input.categoryId,
            keyGroupId: null,
            round,
            order: order++,
            areaId: null,
            areaName: null,
            athleteAId: round === 1 ? seededAthletes[index * 2] ?? null : null,
            athleteBId:
              round === 1 ? seededAthletes[index * 2 + 1] ?? null : null,
          }),
        );
      }
    }

    return {
      fights,
      metadata: [
        {
          categoryId: input.categoryId,
          format: 'OLYMPIC',
          notes: ['Single elimination bracket generated with future fights pre-created'],
        },
      ],
    };
  }
}
