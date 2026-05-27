import { FightTypeOrmEntity } from '../../../src/domain/fight/entities/fight.typeorm-entity';
import { makeFight } from '../../factories';

export class InMemoryFightRepository {
  private fights: FightTypeOrmEntity[] = [];
  private nextId = 1;

  constructor(seed: FightTypeOrmEntity[] = []) {
    this.fights = [...seed];
    this.nextId = seed.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  setFights(fights: FightTypeOrmEntity[]) {
    this.fights = [...fights];
    this.nextId = fights.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  async create(data: Partial<FightTypeOrmEntity>): Promise<FightTypeOrmEntity> {
    const fight = makeFight({
      id: this.nextId++,
      ...data,
    });

    this.fights.push(fight);
    return fight;
  }

  async findById(id: number): Promise<FightTypeOrmEntity | null> {
    return this.fights.find((fight) => fight.id === id) ?? null;
  }

  async list(): Promise<FightTypeOrmEntity[]> {
    return [...this.fights];
  }
}
