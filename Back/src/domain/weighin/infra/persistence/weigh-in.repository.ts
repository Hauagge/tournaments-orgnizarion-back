import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WeighIn } from '../../domain/entities/weigh-in.entity';
import { IWeighInRepository } from '../../repository/IWeighInRepository.repository';
import { WeighInTypeOrmEntity } from './entities/weigh-in.typeorm-entity';
import { WeighInMapper } from './mappers/weigh-in.mapper';

@Injectable()
export class WeighInRepository implements IWeighInRepository {
  constructor(
    @InjectRepository(WeighInTypeOrmEntity)
    private readonly repository: Repository<WeighInTypeOrmEntity>,
  ) {}

  async save(weighIn: WeighIn): Promise<WeighIn> {
    const savedEntity = await this.repository.save(
      this.repository.create(WeighInMapper.toPersistence(weighIn)),
    );

    return WeighInMapper.toDomain(savedEntity);
  }

  async findByCompetitionIdAndAthleteId(
    competitionId: number,
    athleteId: number,
  ): Promise<WeighIn | null> {
    const entity = await this.repository.findOneBy({
      competitionId,
      athleteId,
    });

    return entity ? WeighInMapper.toDomain(entity) : null;
  }

  async findByCompetitionIdAndAthleteIds(
    competitionId: number,
    athleteIds: number[],
  ): Promise<WeighIn[]> {
    if (!athleteIds.length) {
      return [];
    }

    const entities = await this.repository.find({
      where: {
        competitionId,
        athleteId: In(athleteIds),
      },
    });

    return entities.map(WeighInMapper.toDomain);
  }

  async hasAnyForCompetition(competitionId: number): Promise<boolean> {
    const count = await this.repository.count({
      where: { competitionId },
      take: 1,
    });

    return count > 0;
  }
}
