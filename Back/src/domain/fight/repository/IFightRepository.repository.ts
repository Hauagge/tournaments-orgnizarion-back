import { FightEntity } from '../domain/entities/fight.entity';
import { FightStatus } from '../domain/value-objects/fight-status.enum';

export abstract class IFightRepository {
  abstract createMany(fights: FightEntity[]): Promise<FightEntity[]>;
  abstract update(fight: FightEntity): Promise<FightEntity>;
  abstract findById(id: number): Promise<FightEntity | null>;
  abstract listByCompetitionId(input: {
    competitionId: number;
    status?: FightStatus;
  }): Promise<FightEntity[]>;
  abstract listByKeyGroupId(keyGroupId: number): Promise<FightEntity[]>;
  abstract listQueueByAreaId(areaId: number): Promise<FightEntity[]>;
  abstract assignAreas(
    assignments: Array<{ fightId: number; areaId: number | null }>,
  ): Promise<void>;
  abstract countByCompetitionId(competitionId: number): Promise<number>;
}
