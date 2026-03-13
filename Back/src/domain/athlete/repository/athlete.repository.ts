import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Athlete } from '../entities/athlete.entity';
import { Repository } from 'typeorm';
import { BaseRepository } from 'src/core/repository/base.repository';

@Injectable()
export class AthleteRepository extends BaseRepository<Athlete> {
  constructor(
    @InjectRepository(Athlete) private readonly repository: Repository<Athlete>,
  ) {
    super(repository.target, repository.manager);
    this.resourceName = 'Athlete';
    this.resourceLabel = 'Atleta';
  }
  async findById(id: number) {
    return this.repository.findOne({
      where: { id },
    });
  }

  async createAthlete(data: Partial<Athlete>) {
    const athlete = this.repository.create(data);
    return this.repository.save(athlete);
  }

  async updateAthlete(id: number, data: Partial<Athlete>) {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async find(query: any) {
    return this.repository.find(query);
  }
}
