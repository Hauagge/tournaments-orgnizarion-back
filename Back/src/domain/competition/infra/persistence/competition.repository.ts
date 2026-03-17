import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundError } from 'src/shared/errors/not-found.error';
import { Competition } from '../../domain/entities/competition.entity';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';
import { CompetitionTypeOrmEntity } from './entities/competition.typeorm-entity';
import { CompetitionMapper } from './mappers/competition.mapper';

@Injectable()
export class CompetitionRepository implements ICompetitionRepository {
  constructor(
    @InjectRepository(CompetitionTypeOrmEntity)
    private readonly repository: Repository<CompetitionTypeOrmEntity>,
  ) {}

  async create(competition: Competition): Promise<Competition> {
    const entity = this.repository.create(
      CompetitionMapper.toPersistence(competition),
    );
    const savedEntity = await this.repository.save(entity);
    return CompetitionMapper.toDomain(savedEntity);
  }

  async update(competition: Competition): Promise<Competition> {
    await this.repository.update(competition.id as number, {
      name: competition.name,
      mode: competition.mode,
      fightDurationSeconds: competition.fightDurationSeconds,
      weighInMarginGrams: competition.weighInMarginGrams,
      ageSplitYears: competition.ageSplitYears,
    });

    const updatedEntity = await this.repository.findOneBy({
      id: competition.id as number,
    });

    if (!updatedEntity) {
      throw new NotFoundError(
        `Competition with id ${competition.id as number} not found`,
      );
    }

    return CompetitionMapper.toDomain(updatedEntity);
  }

  async findById(id: number): Promise<Competition | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? CompetitionMapper.toDomain(entity) : null;
  }

  async list(input: {
    page: number;
    pageSize: number;
  }): Promise<[Competition[], number]> {
    const [entities, total] = await this.repository.findAndCount({
      order: {
        createdAt: 'DESC',
      },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    });

    return [entities.map(CompetitionMapper.toDomain), total];
  }
}
