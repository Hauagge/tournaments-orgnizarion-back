import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { Area } from '../../domain/entities/area.entity';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';

export type CreateAreasInput = {
  competitionId: number;
  count?: number;
  names?: string[];
};

@Injectable()
export class CreateAreasUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAreaRepository)
    private readonly areaRepository: IAreaRepository,
  ) {}

  async execute(input: CreateAreasInput) {
    const competition = await this.competitionRepository.findById(input.competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${input.competitionId} not found`);
    }

    const names = this.resolveNames(input);
    const existingAreas = await this.areaRepository.listByCompetitionId(input.competitionId);
    const existingNames = new Set(
      existingAreas.map((area) => area.name.toLocaleLowerCase()),
    );

    for (const name of names) {
      if (existingNames.has(name.toLocaleLowerCase())) {
        throw new ValidationError(`Area ${name} already exists in this competition`);
      }
    }

    const startingOrder = existingAreas.length + 1;

    return this.areaRepository.createMany(
      names.map((name, index) =>
        Area.create({
          competitionId: input.competitionId,
          name,
          order: startingOrder + index,
        }),
      ),
    );
  }

  private resolveNames(input: CreateAreasInput): string[] {
    const providedNames = (input.names ?? []).map((name) => Area.normalizeName(name));

    if (input.count === undefined && providedNames.length === 0) {
      throw new ValidationError('Provide count or names to create areas');
    }

    if (
      input.count !== undefined &&
      providedNames.length > 0 &&
      input.count !== providedNames.length
    ) {
      throw new ValidationError('Count must match the number of provided area names');
    }

    const names =
      providedNames.length > 0
        ? providedNames
        : Array.from({ length: input.count as number }, (_, index) => `Area ${index + 1}`);

    if (new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length) {
      throw new ValidationError('Duplicated area names are not allowed');
    }

    return names;
  }
}
