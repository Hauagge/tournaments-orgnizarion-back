import { Athlete } from '../../../src/domain/athlete/entities/athlete.entity';
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

  async createAthlete(data: Partial<Athlete>): Promise<Athlete> {
    const athlete = makeAthlete({
      id: this.nextId++,
      ...data,
    });
    this.athletes.push(athlete);
    return athlete;
  }

  private async update(
    id: number,
    data: Partial<Athlete>,
  ): Promise<Athlete | null> {
    const index = this.athletes.findIndex((athlete) => athlete.id === id);
    if (index < 0) {
      return null;
    }

    this.athletes[index] = {
      ...this.athletes[index],
      ...data,
    };

    return this.athletes[index];
  }

  async updateAthlete(
    id: number,
    data: Partial<Athlete>,
  ): Promise<Athlete | null> {
    return this.update(id, data);
  }

  async find(query: Partial<Athlete> = {}): Promise<Athlete[]> {
    const queryEntries = Object.entries(query);
    if (!queryEntries.length) {
      return [...this.athletes];
    }

    return this.athletes.filter((athlete) => {
      return queryEntries.every(([key, value]) => athlete[key] === value);
    });
  }
}
