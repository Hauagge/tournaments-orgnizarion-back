import { Academy } from '../../../src/domain/academy/domain/entities/academy.entity';
import { IAcademyRepository } from '../../../src/domain/academy/repository/IAcademyRepository.repository';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { makeAcademy } from '../../factories';

export class InMemoryAcademyRepository implements IAcademyRepository {
  private academies: Academy[] = [];
  private nextId = 1;

  constructor(seed: Academy[] = []) {
    this.academies = [...seed];
    this.nextId =
      seed.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1;
  }

  async create(academy: Academy): Promise<Academy> {
    const createdAcademy = makeAcademy({
      ...academy.toJSON(),
      id: this.nextId++,
    });
    this.academies.push(createdAcademy);
    return createdAcademy;
  }

  async update(academy: Academy): Promise<Academy> {
    const index = this.academies.findIndex((item) => item.id === academy.id);

    if (index < 0) {
      throw new NotFoundError(`Academy with id ${academy.id as number} not found`);
    }

    this.academies[index] = academy;
    return academy;
  }

  async findById(id: number): Promise<Academy | null> {
    return this.academies.find((academy) => academy.id === id) ?? null;
  }

  async findByCompetitionIdAndName(
    competitionId: number,
    name: string,
  ): Promise<Academy | null> {
    const normalizedName = Academy.normalizeName(name);

    return (
      this.academies.find(
        (academy) =>
          academy.competitionId === competitionId && academy.name === normalizedName,
      ) ?? null
    );
  }

  async findByCompetitionIdAndNames(
    competitionId: number,
    names: string[],
  ): Promise<Academy[]> {
    const normalizedNames = new Set(
      names.map((name) => Academy.normalizeName(name)),
    );

    if (normalizedNames.size === 0) {
      return [];
    }

    return this.academies.filter(
      (academy) =>
        academy.competitionId === competitionId && normalizedNames.has(academy.name),
    );
  }

  async listByCompetitionId(competitionId: number): Promise<Academy[]> {
    return this.academies
      .filter((academy) => academy.competitionId === competitionId)
      .sort((left, right) => left.name.localeCompare(right.name));
  }
}
