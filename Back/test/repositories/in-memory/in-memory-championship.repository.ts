import { Championship } from '../../../src/domain/championship/entities/championship.entity';
import { makeChampionship } from '../../factories';

export class InMemoryChampionshipRepository {
  private championships: Championship[] = [];
  private nextId = 1;

  constructor(seed: Championship[] = []) {
    this.championships = [...seed];
    this.nextId = seed.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  setChampionships(championships: Championship[]) {
    this.championships = [...championships];
    this.nextId =
      championships.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  async create(data: Partial<Championship>): Promise<Championship> {
    const championship = makeChampionship({
      id: this.nextId++,
      ...data,
    });

    this.championships.push(championship);
    return championship;
  }

  async findById(id: number): Promise<Championship | null> {
    return this.championships.find((item) => item.id === id) ?? null;
  }

  async list(): Promise<Championship[]> {
    return [...this.championships];
  }
}

