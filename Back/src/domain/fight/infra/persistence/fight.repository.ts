import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { AthleteTypeOrmEntity } from '@/domain/athlete/infra/persistence/entities/athlete.typeorm-entity';
import { CategoryTypeOrmEntity } from '@/domain/category/infra/persistence/entities/category.typeorm-entity';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { FightTypeOrmEntity } from '../../entities/fight.typeorm-entity';
import { IFightRepository } from '../../repository/IFightRepository.repository';
import { FightMapper } from './mappers/fight.mapper';

@Injectable()
export class FightRepository implements IFightRepository {
  constructor(
    @InjectRepository(FightTypeOrmEntity)
    private readonly repository: Repository<FightTypeOrmEntity>,
  ) {}

  async create(fight: FightEntity): Promise<FightEntity> {
    const saved = await this.repository.save(
      this.repository.create(FightMapper.toPersistence(fight)),
    );

    return FightMapper.toDomain(saved);
  }

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

  async updateMany(fights: FightEntity[]): Promise<FightEntity[]> {
    for (const fight of fights) {
      await this.update(fight);
    }

    return fights;
  }

  async findById(id: number): Promise<FightEntity | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { area: true },
    });

    return entity ? FightMapper.toDomain(entity) : null;
  }

  async listByCompetitionId(input: {
    competitionId: number;
    status?: FightStatus;
    categoryId?: number;
    round?: number;
    areaId?: number;
    athleteName?: string;
  }): Promise<FightEntity[]> {
    const qb = this.repository
      .createQueryBuilder('fight')
      .leftJoinAndSelect('fight.area', 'area')
      .leftJoin(
        AthleteTypeOrmEntity,
        'athleteA',
        'athleteA.id = fight.athlete_a_id',
      )
      .leftJoin(
        AthleteTypeOrmEntity,
        'athleteB',
        'athleteB.id = fight.athlete_b_id',
      )
      .leftJoin(
        AthleteTypeOrmEntity,
        'winnerAthlete',
        'winnerAthlete.id = fight.winner_athlete_id',
      )
      .leftJoin(
        CategoryTypeOrmEntity,
        'category',
        'category.id = fight.category_id',
      )
      .where('fight.competition_id = :competitionId', {
        competitionId: input.competitionId,
      });

    if (input.status) {
      qb.andWhere('fight.status = :status', { status: input.status });
    }

    if (input.categoryId !== undefined) {
      qb.andWhere('fight.category_id = :categoryId', {
        categoryId: input.categoryId,
      });
    }

    if (input.round !== undefined) {
      qb.andWhere('fight.round_number = :round', { round: input.round });
    }

    if (input.areaId !== undefined) {
      qb.andWhere('fight.area_id = :areaId', { areaId: input.areaId });
    }

    if (input.athleteName?.trim()) {
      qb.andWhere(
        `(
          LOWER(COALESCE(athleteA.full_name, '')) LIKE :term
          OR LOWER(COALESCE(athleteB.full_name, '')) LIKE :term
          OR LOWER(COALESCE(winnerAthlete.full_name, '')) LIKE :term
          OR LOWER(COALESCE(category.name, '')) LIKE :term
        )`,
        { term: `%${input.athleteName.trim().toLowerCase()}%` },
      );
    }

    const entities = await qb
      .orderBy('fight.order_index', 'ASC')
      .addOrderBy('fight.round_number', 'ASC')
      .addOrderBy('fight.category_id', 'ASC')
      .addOrderBy('fight.key_group_id', 'ASC')
      .addOrderBy('fight.id', 'ASC')
      .getMany();

    return entities.map(FightMapper.toDomain);
  }

  async listByCategoryId(input: {
    competitionId: number;
    categoryId: number;
  }): Promise<FightEntity[]> {
    return this.listByCompetitionId(input);
  }

  async listByKeyGroupId(keyGroupId: number): Promise<FightEntity[]> {
    const entities = await this.repository.find({
      where: { keyGroupId },
      order: { order: 'ASC', id: 'ASC' },
      relations: {
        area: true,
      },
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
        order: 'ASC',
        categoryId: 'ASC',
        keyGroupId: 'ASC',
        id: 'ASC',
      },
      relations: {
        area: true,
      },
    });

    const statusPriority: Record<FightStatus, number> = {
      [FightStatus.IN_PROGRESS]: 0,
      [FightStatus.CALLED]: 1,
      [FightStatus.PENDING]: 2,
      [FightStatus.FINISHED]: 3,
      [FightStatus.CANCELED]: 4,
    };

    return entities.map(FightMapper.toDomain).sort((a, b) => {
      const statusCompare = statusPriority[a.status] - statusPriority[b.status];
      if (statusCompare !== 0) {
        return statusCompare;
      }

      if (a.order !== b.order) {
        return a.order - b.order;
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

  async updateOrder(
    items: Array<{ fightId: number; orderIndex: number }>,
  ): Promise<void> {
    for (const item of items) {
      await this.repository.update(
        { id: item.fightId },
        { order: item.orderIndex },
      );
    }
  }

  async countByCompetitionId(competitionId: number): Promise<number> {
    return this.repository.count({
      where: { competitionId },
    });
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete({ id });
  }
}
