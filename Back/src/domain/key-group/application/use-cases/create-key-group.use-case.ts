import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import {
  IKeyGroupRepository,
  KeyGroupDetailsView,
} from '../../repository/IKeyGroupRepository.repository';

export type CreateKeyGroupInput = {
  competitionId: number;
  categoryId?: number | null;
  name?: string | null;
  athleteIds?: number[];
};

@Injectable()
export class CreateKeyGroupUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
  ) {}

  async execute(input: CreateKeyGroupInput): Promise<KeyGroupDetailsView> {
    const competition = await this.competitionRepository.findById(input.competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${input.competitionId} not found`);
    }

    if (competition.mode !== CompetitionMode.KEYS) {
      throw new ValidationError('Key groups are only available for competitions in KEYS mode');
    }

    if (input.categoryId !== undefined && input.categoryId !== null) {
      const category = await this.categoryRepository.findById(input.categoryId);

      if (!category || category.competitionId !== input.competitionId) {
        throw new ValidationError('Category does not belong to the selected competition');
      }
    }

    const athleteIds = input.athleteIds ?? [];

    if (new Set(athleteIds).size !== athleteIds.length) {
      throw new ValidationError('athleteIds cannot contain duplicates');
    }

    if (athleteIds.length > 0) {
      const [athletes, existingGroups] = await Promise.all([
        Promise.all(
          athleteIds.map((athleteId) => this.athleteRepository.findById(athleteId)),
        ),
        Promise.all(
          athleteIds.map((athleteId) =>
            this.keyGroupRepository.findByCompetitionIdAndAthleteId(
              input.competitionId,
              athleteId,
            ),
          ),
        ),
      ]);

      for (let index = 0; index < athleteIds.length; index++) {
        const athleteId = athleteIds[index];
        const athlete = athletes[index];
        const existingGroup = existingGroups[index];

        if (!athlete) {
          throw new NotFoundError(`Athlete with id ${athleteId} not found`);
        }

        if (athlete.competitionId !== input.competitionId) {
          throw new ValidationError('Athlete does not belong to the same competition');
        }

        if (existingGroup) {
          throw new ValidationError(
            'Athlete is already assigned to another key group in this competition',
          );
        }
      }
    }

    const group = await this.keyGroupRepository.create(
      KeyGroup.create({
        competitionId: input.competitionId,
        categoryId: input.categoryId ?? null,
        name: input.name ?? null,
      }),
    );

    if (athleteIds.length > 0) {
      await Promise.all(
        athleteIds.map((athleteId) =>
          this.keyGroupRepository.addMember(group.id as number, athleteId),
        ),
      );

      const nextStatus =
        athleteIds.length >= 2 ? group.markReady() : group.markDraft();
      await this.keyGroupRepository.update(nextStatus);
    }

    const details = await this.keyGroupRepository.getDetails(group.id as number);

    if (!details) {
      throw new NotFoundError(`Key group with id ${group.id as number} not found`);
    }

    return details;
  }
}
