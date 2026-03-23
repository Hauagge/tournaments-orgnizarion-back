import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { Athlete } from '../../../src/domain/athlete/domain/entities/athlete.entity';
import { IAthleteRepository } from '../../../src/domain/athlete/repository/IAthleteRepository.repository';
import { makeAthlete } from '../../factories';

export class InMemoryAthleteRepository implements IAthleteRepository {
  private athletes: Athlete[] = [];
  private nextId = 1;

  constructor(seed: Athlete[] = []) {
    this.athletes = [...seed];
    this.nextId = seed.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  setAthletes(athletes: Athlete[]) {
    this.athletes = [...athletes];
    this.nextId = athletes.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  async findById(id: number): Promise<Athlete | null> {
    return this.athletes.find((athlete) => athlete.id === id) ?? null;
  }

  async create(athlete: Athlete): Promise<Athlete> {
    const createdAthlete = makeAthlete({
      ...athlete.toJSON(),
      id: this.nextId++,
    });
    this.athletes.push(createdAthlete);
    return createdAthlete;
  }

  async update(athlete: Athlete): Promise<Athlete> {
    const index = this.athletes.findIndex((item) => item.id === athlete.id);
    if (index < 0) {
      throw new NotFoundError(
        `Athlete with id ${athlete.id as number} not found`,
      );
    }

    this.athletes[index] = athlete;
    return athlete;
  }

  async findByIds(ids: number[]): Promise<Athlete[]> {
    if (!ids.length) {
      return [];
    }

    const allowedIds = new Set(ids);

    return this.athletes
      .filter((athlete) => athlete.id !== undefined && allowedIds.has(athlete.id))
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
  }

  async search(input: {
    competitionId: number;
    query?: string;
    academyId?: number;
  }): Promise<Athlete[]> {
    const normalizedQuery = input.query?.trim().toLowerCase();

    return [...this.athletes]
      .filter((athlete) => athlete.competitionId === input.competitionId)
      .filter((athlete) =>
        normalizedQuery
          ? athlete.fullName.toLowerCase().includes(normalizedQuery)
          : true,
      )
      .filter((athlete) =>
        input.academyId !== undefined
          ? athlete.academyId === input.academyId
          : true,
      )
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
  }
}
