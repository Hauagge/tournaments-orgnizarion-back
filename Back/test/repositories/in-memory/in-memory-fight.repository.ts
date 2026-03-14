import { Fight } from '../../../src/domain/fight/entities/fight.entinty';
import { makeFight } from '../../factories';

export class InMemoryFightRepository {
  private fights: Fight[] = [];
  private nextId = 1;

  constructor(seed: Fight[] = []) {
    this.fights = [...seed];
    this.nextId = seed.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  setFights(fights: Fight[]) {
    this.fights = [...fights];
    this.nextId = fights.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  async create(data: Partial<Fight>): Promise<Fight> {
    const fight = makeFight({
      id: this.nextId++,
      ...data,
    });

    this.fights.push(fight);
    return fight;
  }

  async findById(id: number): Promise<Fight | null> {
    return this.fights.find((fight) => fight.id === id) ?? null;
  }

  async list(): Promise<Fight[]> {
    return [...this.fights];
  }
}

