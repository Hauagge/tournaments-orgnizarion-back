import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Athlete } from '../../domain/entities/athlete.entity';
import { IAthleteRepository } from '../../repository/IAthleteRepository.repository';
import { AthleteTypeOrmEntity } from './entities/athlete.typeorm-entity';
import { AthleteMapper } from './mappers/athlete.mapper';

@Injectable()
export class AthleteRepository implements IAthleteRepository {
  constructor(
    @InjectRepository(AthleteTypeOrmEntity)
    private readonly repository: Repository<AthleteTypeOrmEntity>,
  ) {}

  async create(athlete: Athlete): Promise<Athlete> {
    const entity = this.repository.create(AthleteMapper.toPersistence(athlete));
    const savedEntity = await this.repository.save(entity);
    return AthleteMapper.toDomain(savedEntity);
  }

  async update(athlete: Athlete): Promise<Athlete> {
    await this.repository.update(athlete.id as number, {
      fullName: athlete.fullName,
      birthDate: athlete.birthDate,
      belt: athlete.belt,
      declaredWeight: athlete.declaredWeight,
      academyId: athlete.academyId,
    });

    const updatedEntity = await this.repository.findOneBy({
      id: athlete.id as number,
    });

    if (!updatedEntity) {
      throw new NotFoundError(
        `Athlete with id ${athlete.id as number} not found`,
      );
    }

    return AthleteMapper.toDomain(updatedEntity);
  }

  async findById(id: number): Promise<Athlete | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? AthleteMapper.toDomain(entity) : null;
  }

  async findByIds(ids: number[]): Promise<Athlete[]> {
    if (!ids.length) {
      return [];
    }

    const entities = await this.repository.find({
      where: {
        id: In(ids),
      },
      order: {
        fullName: 'ASC',
      },
    });

    return entities.map(AthleteMapper.toDomain);
  }

  async search(input: {
    competitionId: number;
    query?: string;
    academyId?: number;
  }): Promise<Athlete[]> {
    const where = {
      competitionId: input.competitionId,
      ...(input.query ? { fullName: ILike(`%${input.query.trim()}%`) } : {}),
      ...(input.academyId !== undefined ? { academyId: input.academyId } : {}),
    };

    const entities = await this.repository.find({
      where,
      order: {
        fullName: 'ASC',
      },
    });

    return entities.map(AthleteMapper.toDomain);
  }
}
