import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Belt } from '../entities/belt.entity';
import { Repository } from 'typeorm';

import { BaseRepository } from 'src/core/repository/base.repository';

@Injectable()
export class BeltRepository extends BaseRepository<Belt> {
  constructor(
    @InjectRepository(Belt) private readonly repository: Repository<Belt>,
  ) {
    super(repository.target, repository.manager);
    this.resourceName = 'Athlete';
    this.resourceLabel = 'Atleta';
  }

  async findByColor(color: string) {
    const belt = await this.repository.findOne({
      where: {
        color: color.toLocaleLowerCase(),
      },
    });

    return belt;
  }
}
