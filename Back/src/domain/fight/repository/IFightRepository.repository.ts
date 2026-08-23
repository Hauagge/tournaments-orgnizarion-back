import { FightEntity } from '../domain/entities/fight.entity';
import { FightStatus } from '../domain/value-objects/fight-status.enum';

export abstract class IFightRepository {
  abstract create(fight: FightEntity): Promise<FightEntity>;
  abstract createMany(fights: FightEntity[]): Promise<FightEntity[]>;
  abstract update(fight: FightEntity): Promise<FightEntity>;
  abstract updateMany(fights: FightEntity[]): Promise<FightEntity[]>;
  abstract findById(id: number): Promise<FightEntity | null>;
  abstract listByCompetitionId(input: {
    competitionId: number;
    status?: FightStatus;
    categoryId?: number;
    round?: number;
    areaId?: number;
    athleteName?: string;
  }): Promise<FightEntity[]>;
  abstract listByCategoryId(input: {
    competitionId: number;
    categoryId: number;
  }): Promise<FightEntity[]>;
  abstract listByKeyGroupId(keyGroupId: number): Promise<FightEntity[]>;
  abstract listQueueByAreaId(areaId: number): Promise<FightEntity[]>;
  abstract assignAreas(
    assignments: Array<{ fightId: number; areaId: number | null }>,
  ): Promise<void>;
  abstract updateOrder(
    items: Array<{ fightId: number; orderIndex: number }>,
  ): Promise<void>;
  abstract countByCompetitionId(competitionId: number): Promise<number>;
  abstract delete(id: number): Promise<void>;
  abstract withTransaction<T>(
    work: (repository: IFightRepository) => Promise<T>,
  ): Promise<T>;
}
