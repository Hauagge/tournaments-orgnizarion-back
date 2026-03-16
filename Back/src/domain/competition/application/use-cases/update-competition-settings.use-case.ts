import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Competition } from '../../domain/entities/competition.entity';
import { CompetitionMode } from '../../domain/value-objects/competition-mode.enum';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';

export type UpdateCompetitionSettingsInput = {
  id: number;
  name?: string;
  mode?: CompetitionMode;
  fightDurationSeconds?: number;
  weighInMarginGrams?: number;
  ageSplitYears?: number;
};

@Injectable()
export class UpdateCompetitionSettingsUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
  ) {}

  async execute(input: UpdateCompetitionSettingsInput): Promise<Competition> {
    const competition = await this.competitionRepository.findById(input.id);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${input.id} not found`);
    }

    const updatedCompetition = competition.updateSettings({
      name: input.name,
      mode: input.mode,
      fightDurationSeconds: input.fightDurationSeconds,
      weighInMarginGrams: input.weighInMarginGrams,
      ageSplitYears: input.ageSplitYears,
    });

    return this.competitionRepository.update(updatedCompetition);
  }
}
