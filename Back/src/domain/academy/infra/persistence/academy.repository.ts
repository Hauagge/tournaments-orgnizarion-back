import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Academy } from '../../domain/entities/academy.entity';
import { IAcademyRepository } from '../../repository/IAcademyRepository.repository';
import { AcademyTypeOrmEntity } from './entities/academy.typeorm-entity';
import { AcademyMapper } from './mappers/academy.mapper';

@Injectable()
export class AcademyRepository implements IAcademyRepository {
  constructor(
    @InjectRepository(AcademyTypeOrmEntity)
    private readonly repository: Repository<AcademyTypeOrmEntity>,
  ) {}

  async create(academy: Academy): Promise<Academy> {
    const entity = this.repository.create(AcademyMapper.toPersistence(academy));
    const savedEntity = await this.repository.save(entity);
    return AcademyMapper.toDomain(savedEntity);
  }

  async update(academy: Academy): Promise<Academy> {
    const result = await this.repository.update(
      { id: academy.id as number },
      AcademyMapper.toPersistence(academy),
    );

    if (!result.affected) {
      throw new NotFoundError(`Academy with id ${academy.id as number} not found`);
    }

    return academy;
  }

  async findById(id: number): Promise<Academy | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? AcademyMapper.toDomain(entity) : null;
  }

  async findByCompetitionIdAndName(
    competitionId: number,
    name: string,
  ): Promise<Academy | null> {
    const normalizedName = Academy.normalizeName(name).toLocaleLowerCase('en-US');

    const entity = await this.repository
      .createQueryBuilder('academy')
      .where('academy.competition_id = :competitionId', { competitionId })
      .andWhere('LOWER(academy.name) = :normalizedName', { normalizedName })
      .getOne();

    return entity ? AcademyMapper.toDomain(entity) : null;
  }

  async findByCompetitionIdAndNames(
    competitionId: number,
    names: string[],
  ): Promise<Academy[]> {
    const normalizedNames = [
      ...new Set(
        names.map((name) => Academy.normalizeName(name).toLocaleLowerCase('en-US')),
      ),
    ];

    if (normalizedNames.length === 0) {
      return [];
    }

    const entities = await this.repository
      .createQueryBuilder('academy')
      .where('academy.competition_id = :competitionId', { competitionId })
      .andWhere(
        new Brackets((queryBuilder) => {
          queryBuilder.where('LOWER(academy.name) IN (:...normalizedNames)', {
            normalizedNames,
          });
        }),
      )
      .orderBy('academy.name', 'ASC')
      .getMany();

    return entities.map((entity) => AcademyMapper.toDomain(entity));
  }

  async listByCompetitionId(competitionId: number): Promise<Academy[]> {
    const entities = await this.repository.find({
      where: { competitionId },
      order: { name: 'ASC' },
    });

    return entities.map((entity) => AcademyMapper.toDomain(entity));
  }
}
