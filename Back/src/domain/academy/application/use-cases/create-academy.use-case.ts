import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { Academy } from '../../domain/entities/academy.entity';
import { IAcademyRepository } from '../../repository/IAcademyRepository.repository';

export type CreateAcademyInput = {
  competitionId: number;
  name: string;
};

@Injectable()
export class CreateAcademyUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
  ) {}

  async execute(input: CreateAcademyInput): Promise<Academy> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const existingAcademy =
      await this.academyRepository.findByCompetitionIdAndName(
        input.competitionId,
        input.name,
      );

    if (existingAcademy) {
      throw new ValidationError('Academy already exists for this competition');
    }

    return this.academyRepository.create(Academy.create(input));
  }
}
