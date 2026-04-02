import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { Academy } from '../../domain/entities/academy.entity';
import { IAcademyRepository } from '../../repository/IAcademyRepository.repository';

export type UpdateAcademyInput = {
  id: number;
  name?: string;
};

@Injectable()
export class UpdateAcademyUseCase {
  constructor(
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
  ) {}

  async execute(input: UpdateAcademyInput): Promise<Academy> {
    const academy = await this.academyRepository.findById(input.id);

    if (!academy) {
      throw new NotFoundError(`Academy with id ${input.id} not found`);
    }

    if (!input.name) {
      return this.academyRepository.update(academy.update({}));
    }

    const existingAcademy =
      await this.academyRepository.findByCompetitionIdAndName(
        academy.competitionId,
        input.name,
      );

    if (existingAcademy && existingAcademy.id !== academy.id) {
      throw new ValidationError('Academy already exists for this competition');
    }

    return this.academyRepository.update(
      academy.update({
        name: input.name,
      }),
    );
  }
}
