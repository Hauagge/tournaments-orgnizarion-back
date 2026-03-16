import { Inject, Injectable } from '@nestjs/common';
import { Competition } from '../../domain/entities/competition.entity';
import { CompetitionMode } from '../../domain/value-objects/competition-mode.enum';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';

export type CreateCompetitionInput = {
  name: string;
  mode: CompetitionMode;
  fightDurationSeconds: number;
  weighInMarginGrams: number;
  ageSplitYears: number;
};

@Injectable()
export class CreateCompetitionUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
  ) {}

  async execute(input: CreateCompetitionInput): Promise<Competition> {
    const competition = Competition.create(input);
    return this.competitionRepository.create(competition);
  }
}
