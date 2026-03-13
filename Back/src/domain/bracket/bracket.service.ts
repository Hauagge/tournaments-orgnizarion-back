import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../category/repository/category.repository';
import { Category } from '../category/entities/categoory.entitty';

@Injectable()
export class BracketService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async findAll(): Promise<Array<Category>> {
    const category = await this.categoryRepository.find();

    return category;
  }
}
