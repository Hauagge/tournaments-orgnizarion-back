import { FightEntity } from '../../../src/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '../../../src/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '../../../src/domain/fight/repository/IFightRepository.repository';

export class InMemoryFightRepository implements IFightRepository {
  private fights: FightEntity[] = [];
  private nextId = 1;

  constructor(seed: FightEntity[] = []) {
    this.setFights(seed);
  }

  setFights(fights: FightEntity[]) {
    this.fights = [...fights];
    this.nextId =
      fights.reduce((max, fight) => Math.max(max, fight.id ?? 0), 0) + 1;
  }

  async create(fight: FightEntity): Promise<FightEntity> {
    const [saved] = await this.createMany([fight]);
    return saved;
  }

  async createMany(fights: FightEntity[]): Promise<FightEntity[]> {
    const saved = fights.map((fight) =>
      FightEntity.restore({ ...fight.toJSON(), id: this.nextId++ }),
    );
    this.fights = [...this.fights, ...saved];
    return saved;
  }

  async update(fight: FightEntity): Promise<FightEntity> {
    this.fights = this.fights.map((current) =>
      current.id === fight.id ? fight : current,
    );
    return fight;
  }

  async updateMany(fights: FightEntity[]): Promise<FightEntity[]> {
    for (const fight of fights) {
      await this.update(fight);
    }
    return fights;
  }

  async findById(id: number): Promise<FightEntity | null> {
    return this.fights.find((fight) => fight.id === id) ?? null;
  }

  async listByCompetitionId(input: {
    competitionId: number;
    status?: FightStatus;
    categoryId?: number;
    round?: number;
    areaId?: number;
  }): Promise<FightEntity[]> {
    return this.fights
      .filter(
        (fight) =>
          fight.competitionId === input.competitionId &&
          (input.status ? fight.status === input.status : true) &&
          (input.categoryId !== undefined
            ? fight.categoryId === input.categoryId
            : true) &&
          (input.round !== undefined ? fight.round === input.round : true) &&
          (input.areaId !== undefined ? fight.areaId === input.areaId : true),
      )
      .sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }
        if (left.round !== right.round) {
          return left.round - right.round;
        }
        if ((left.categoryId ?? 0) !== (right.categoryId ?? 0)) {
          return (left.categoryId ?? 0) - (right.categoryId ?? 0);
        }
        if ((left.keyGroupId ?? 0) !== (right.keyGroupId ?? 0)) {
          return (left.keyGroupId ?? 0) - (right.keyGroupId ?? 0);
        }
        return (left.id ?? 0) - (right.id ?? 0);
      });
  }

  async listByCategoryId(input: {
    competitionId: number;
    categoryId: number;
  }): Promise<FightEntity[]> {
    return this.fights.filter(
      (fight) =>
        fight.competitionId === input.competitionId &&
        fight.categoryId === input.categoryId,
    );
  }

  async listByKeyGroupId(keyGroupId: number): Promise<FightEntity[]> {
    return this.fights.filter((fight) => fight.keyGroupId === keyGroupId);
  }

  async listQueueByAreaId(areaId: number): Promise<FightEntity[]> {
    return this.fights.filter((fight) => fight.areaId === areaId);
  }

  async assignAreas(
    assignments: Array<{ fightId: number; areaId: number | null }>,
  ): Promise<void> {
    for (const assignment of assignments) {
      const fight = this.fights.find(
        (current) => current.id === assignment.fightId,
      );
      if (fight) {
        await this.update(fight.assignArea(assignment.areaId));
      }
    }
  }

  async updateOrder(
    items: Array<{ fightId: number; orderIndex: number }>,
  ): Promise<void> {
    for (const item of items) {
      const fight = this.fights.find((current) => current.id === item.fightId);
      if (fight) {
        await this.update(fight.updateDetails({ order: item.orderIndex }));
      }
    }
  }

  async countByCompetitionId(competitionId: number): Promise<number> {
    return this.fights.filter((fight) => fight.competitionId === competitionId)
      .length;
  }

  async delete(id: number): Promise<void> {
    this.fights = this.fights.filter((fight) => fight.id !== id);
  }

  async withTransaction<T>(
    work: (repository: IFightRepository) => Promise<T>,
  ): Promise<T> {
    return work(this);
  }
}
