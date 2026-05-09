import { Inject, Injectable } from '@nestjs/common';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { Competition } from '../../domain/entities/competition.entity';
import { CompetitionMode } from '../../domain/value-objects/competition-mode.enum';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';
import { Logger } from '@/configuration/logger.configuration';

export type CreateCompetitionInput = {
  currentUserId: number;
  name: string;
  mode: CompetitionMode;
  fightDurationSeconds: number;
  weighInMarginGrams: number;
  ageSplitYears: number;
};

@Injectable()
export class CreateCompetitionUseCase {
  private readonly logger = new Logger(CreateCompetitionUseCase.name);
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
  ) {}

  async execute(input: CreateCompetitionInput): Promise<Competition> {
    const competition = Competition.create({
      name: input.name,
      mode: input.mode,
      fightDurationSeconds: input.fightDurationSeconds,
      weighInMarginGrams: input.weighInMarginGrams,
      ageSplitYears: input.ageSplitYears,
    });
    const createdCompetition = await this.competitionRepository.create(competition);

    await this.userCompetitionRepository.grantAccess({
      userId: input.currentUserId,
      competitionId: createdCompetition.id as number,
      role: CompetitionAccessRole.OWNER,
    });

    return createdCompetition;
  }
}
