import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { IFightRepository } from '../../repository/IFightRepository.repository';
import { FightTypeOrmEntity } from '../../entities/fight.typeorm-entity';
import { FightMapper } from './mappers/fight.mapper';

@Injectable()
export class FightRepository implements IFightRepository {
  constructor(
    @InjectRepository(FightTypeOrmEntity)
    private readonly repository: Repository<FightTypeOrmEntity>,
  ) {}

  async createMany(fights: FightEntity[]): Promise<FightEntity[]> {
    const saved = await this.repository.save(
      fights.map((fight) =>
        this.repository.create(FightMapper.toPersistence(fight)),
      ),
    );

    return saved.map(FightMapper.toDomain);
  }

  async update(fight: FightEntity): Promise<FightEntity> {
    const result = await this.repository.update(
      { id: fight.id as number },
      FightMapper.toPersistence(fight),
    );

    if (!result.affected) {
      throw new NotFoundError(`Fight with id ${fight.id as number} not found`);
    }

    return fight;
  }

  async findById(id: number): Promise<FightEntity | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? FightMapper.toDomain(entity) : null;
  }

  async listByCompetitionId(input: {
    competitionId: number;
    status?: FightStatus;
  }): Promise<FightEntity[]> {
    const entities = await this.repository.find({
      where: {
        competitionId: input.competitionId,
        ...(input.status ? { status: input.status } : {}),
      },
      order: {
        categoryId: 'ASC',
        keyGroupId: 'ASC',
        orderIndex: 'ASC',
        id: 'ASC',
      },
      relations: {
        area: true,
      },
    });

    return entities.map(FightMapper.toDomain);
  }

  async listByKeyGroupId(keyGroupId: number): Promise<FightEntity[]> {
    const entities = await this.repository.find({
      where: { keyGroupId },
      order: { orderIndex: 'ASC', id: 'ASC' },
    });

    return entities.map(FightMapper.toDomain);
  }

  async listQueueByAreaId(areaId: number): Promise<FightEntity[]> {
    const entities = await this.repository.find({
      where: {
        areaId,
        status: Not(In([FightStatus.FINISHED, FightStatus.CANCELED])),
      },
      order: {
        categoryId: 'ASC',
        keyGroupId: 'ASC',
        orderIndex: 'ASC',
        id: 'ASC',
      },
    });

    const statusPriority: Record<FightStatus, number> = {
      [FightStatus.IN_PROGRESS]: 0,
      [FightStatus.CALLED]: 1,
      [FightStatus.WAITING]: 2,
      [FightStatus.FINISHED]: 3,
      [FightStatus.CANCELED]: 4,
    };

    return entities.map(FightMapper.toDomain).sort((a, b) => {
      const statusCompare = statusPriority[a.status] - statusPriority[b.status];
      if (statusCompare !== 0) {
        return statusCompare;
      }

      const categoryCompare =
        (a.categoryId ?? Number.MAX_SAFE_INTEGER) -
        (b.categoryId ?? Number.MAX_SAFE_INTEGER);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }

      const keyGroupCompare =
        (a.keyGroupId ?? Number.MAX_SAFE_INTEGER) -
        (b.keyGroupId ?? Number.MAX_SAFE_INTEGER);
      if (keyGroupCompare !== 0) {
        return keyGroupCompare;
      }

      if (a.orderIndex !== b.orderIndex) {
        return a.orderIndex - b.orderIndex;
      }

      return (a.id as number) - (b.id as number);
    });
  }

  async assignAreas(
    assignments: Array<{ fightId: number; areaId: number | null }>,
  ): Promise<void> {
    for (const assignment of assignments) {
      await this.repository.update(
        { id: assignment.fightId },
        { areaId: assignment.areaId },
      );
    }
  }

  async countByCompetitionId(competitionId: number): Promise<number> {
    return this.repository.count({
      where: { competitionId },
    });
  }
}
