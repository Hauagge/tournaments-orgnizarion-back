import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Area } from '../../domain/entities/area.entity';
import { AreaQueueItem } from '../../domain/entities/area-queue-item.entity';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from '../../repository/IAreaQueueItemRepository.repository';
import { AreaTypeOrmEntity } from './entities/area.typeorm-entity';
import { AreaQueueItemTypeOrmEntity } from './entities/area-queue-item.typeorm-entity';
import { AreaMapper } from './mappers/area.mapper';

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

  async listByAreaId(areaId: number): Promise<AreaQueueItem[]> {
    const entities = await this.areaQueueItemRepository.find({
      where: { areaId },
      order: { position: 'ASC', id: 'ASC' },
    });

    return entities.map(AreaMapper.queueItemToDomain);
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
