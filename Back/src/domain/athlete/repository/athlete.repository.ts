import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Athlete } from '../entities/athlete.entity';
import { Repository } from 'typeorm';
import { BaseRepository } from 'src/core/repository/base.repository';
import { IAthleteRepository } from './IAthleteRepository.repository';

@Injectable()
export class AthleteRepository
  extends BaseRepository<Athlete>
  implements IAthleteRepository
{
  constructor(
    @InjectRepository(Athlete) private readonly repository: Repository<Athlete>,
  ) {
    super(repository.target, repository.manager);
    this.resourceName = 'Athlete';
    this.resourceLabel = 'Atleta';
  }
  async findById(id: number): Promise<Athlete | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async createAthlete(data: Partial<Athlete>): Promise<Athlete> {
    const athlete = this.repository.create(data);
    return this.repository.save(athlete);
  }

  async updateAthlete(
    id: number,
    data: Partial<Athlete>,
  ): Promise<Athlete | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async find(query: any): Promise<Athlete[]> {
    return this.repository.find(query);
  }
}
