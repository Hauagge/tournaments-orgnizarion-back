import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Bracket } from '../entities/bracket.entity';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { Athlete } from 'src/domain/athlete/entities/athlete.entity';
import { BaseRepository } from 'src/core/repository/base.repository';

@Injectable()
export class BracketRepository extends BaseRepository<Bracket> {
  constructor(@InjectRepository(Bracket) private repo: Repository<Bracket>) {
    super(repo.target, repo.manager);
    this.resourceName = 'Bracket';
    this.resourceLabel = 'Bracket';
  }

  async findByCategory(categoryId: number) {
    const bracket = await this.repo.findOne({
      where: {
        categoryId,
      },
      relations: ['fights'],
    });

    return bracket;
  }

  async updateBracket(id: number, data: Partial<Bracket>) {
    const bracket = await this.repo.findOne({ where: { id } });
    if (!bracket) {
      throw new Error('Bracket not found');
    }
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }
}
