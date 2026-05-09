import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FightTypeOrmEntity } from '@/domain/fight/entities/fight.typeorm-entity';
import { AthleteTypeOrmEntity } from '@/domain/athlete/infra/persistence/entities/athlete.typeorm-entity';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Area } from '../../domain/entities/area.entity';
import { AreaQueueItem } from '../../domain/entities/area-queue-item.entity';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from '../../repository/IAreaQueueItemRepository.repository';
import { AreaQueueFightDetails } from '../../repository/area-queue-fight-details.type';
import { AreaTypeOrmEntity } from './entities/area.typeorm-entity';
import { AreaQueueItemTypeOrmEntity } from './entities/area-queue-item.typeorm-entity';
import { AreaMapper } from './mappers/area.mapper';
import { AreaQueueFightDetailsRow } from './types/area-queue-fight-details-row.type';

@Injectable()
export class AreaRepository implements IAreaRepository, IAreaQueueItemRepository {
  constructor(
    @InjectRepository(AreaTypeOrmEntity)
    private readonly areaRepository: Repository<AreaTypeOrmEntity>,
    @InjectRepository(AreaQueueItemTypeOrmEntity)
    private readonly areaQueueItemRepository: Repository<AreaQueueItemTypeOrmEntity>,
  ) {}

  async createMany(areas: Area[]): Promise<Area[]> {
    const saved = await this.areaRepository.save(
      areas.map((area) => this.areaRepository.create(AreaMapper.toPersistence(area))),
    );

    return saved.map(AreaMapper.toDomain);
  }

  async findById(id: number): Promise<Area | null> {
    const entity = await this.areaRepository.findOneBy({ id });
    return entity ? AreaMapper.toDomain(entity) : null;
  }

  async listByCompetitionId(competitionId: number): Promise<Area[]> {
    const entities = await this.areaRepository.find({
      where: { competitionId },
      order: { order: 'ASC', id: 'ASC' },
    });

    return entities.map(AreaMapper.toDomain);
  }

  async replaceForCompetition(input: {
    competitionId: number;
    items: AreaQueueItem[];
  }): Promise<AreaQueueItem[]> {
    const areas = await this.listByCompetitionId(input.competitionId);
    const areaIds = areas.map((area) => area.id as number);

    if (areaIds.length > 0) {
      await this.areaQueueItemRepository.delete({ areaId: In(areaIds) });
    }

    const saved = await this.areaQueueItemRepository.save(
      input.items.map((item) =>
        this.areaQueueItemRepository.create(AreaMapper.queueItemToPersistence(item)),
      ),
    );

    return saved.map(AreaMapper.queueItemToDomain);
  }

  async createManyQueueItems(items: AreaQueueItem[]): Promise<AreaQueueItem[]> {
    if (items.length === 0) {
      return [];
    }

    const saved = await this.areaQueueItemRepository.save(
      items.map((item) =>
        this.areaQueueItemRepository.create(AreaMapper.queueItemToPersistence(item)),
      ),
    );

    return saved.map(AreaMapper.queueItemToDomain);
  }

  async listByAreaId(areaId: number): Promise<AreaQueueItem[]> {
    const entities = await this.areaQueueItemRepository.find({
      where: { areaId },
      order: { position: 'ASC', id: 'ASC' },
    });

    return entities.map(AreaMapper.queueItemToDomain);
  }

  async listFightDetailsByAreaId(areaId: number): Promise<AreaQueueFightDetails[]> {
    const rows = await this.areaQueueItemRepository
      .createQueryBuilder('queue_item')
      .innerJoin(FightTypeOrmEntity, 'fight', 'fight.id = queue_item.fight_id')
      .leftJoin(AthleteTypeOrmEntity, 'athlete_a', 'athlete_a.id = fight.athlete_a_id')
      .leftJoin(AthleteTypeOrmEntity, 'athlete_b', 'athlete_b.id = fight.athlete_b_id')
      .where('queue_item.area_id = :areaId', { areaId })
      .orderBy('queue_item.position', 'ASC')
      .addOrderBy('queue_item.id', 'ASC')
      .select([
        'queue_item.id AS "queueItemId"',
        'queue_item.fight_id AS "fightId"',
        'queue_item.position AS "position"',
        'queue_item.status AS "queueStatus"',
        'fight.status AS "fightStatus"',
        'fight.athlete_a_id AS "athleteAId"',
        'athlete_a.full_name AS "athleteAName"',
        'fight.athlete_b_id AS "athleteBId"',
        'athlete_b.full_name AS "athleteBName"',
        'fight.key_group_id AS "keyGroupId"',
        'fight.order_index AS "orderIndex"',
      ])
      .getRawMany<AreaQueueFightDetailsRow>();

    return rows.map((row) => ({
      queueItemId: Number(row.queueItemId),
      fightId: Number(row.fightId),
      position: Number(row.position),
      queueStatus: row.queueStatus,
      fightStatus: row.fightStatus,
      athleteAId: Number(row.athleteAId),
      athleteAName: row.athleteAName,
      athleteBId: Number(row.athleteBId),
      athleteBName: row.athleteBName,
      keyGroupId: row.keyGroupId === null ? null : Number(row.keyGroupId),
      orderIndex: Number(row.orderIndex),
    }));
  }

  async findByFightId(fightId: number): Promise<AreaQueueItem | null> {
    const entity = await this.areaQueueItemRepository.findOne({
      where: { fightId },
      order: { position: 'ASC' },
    });

    return entity ? AreaMapper.queueItemToDomain(entity) : null;
  }

  async update(item: AreaQueueItem): Promise<AreaQueueItem> {
    const result = await this.areaQueueItemRepository.update(
      { id: item.id as number },
      AreaMapper.queueItemToPersistence(item),
    );

    if (!result.affected) {
      throw new NotFoundError(`AreaQueueItem with id ${item.id as number} not found`);
    }

    return item;
  }
}
