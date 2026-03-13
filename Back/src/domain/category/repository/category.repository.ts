import { BaseRepository } from 'src/core/repository/base.repository';
import { Category } from '../entities/categoory.entitty';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import {
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

@Injectable()
export class CategoryRepository extends BaseRepository<Category> {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
  ) {
    super(repository.target, repository.manager);
    this.resourceName = 'Category';
    this.resourceLabel = 'Categoria';
  }

  async findById(id: number) {
    return this.repository.findOne({
      where: { id },
    });
  }

  async createCategory(data: Partial<Category>) {
    const category = this.repository.create(data);
    return this.repository.save(category);
  }

  async findByAgeAndWeight(age: number, weight: number) {
    return this.repository.findOne({
      where: {
        minAge: MoreThanOrEqual(age),
        maxAge: LessThanOrEqual(age),
        minWeight: MoreThanOrEqual(weight),
        maxWeight: LessThanOrEqual(weight),
      },
    });
  }
}
