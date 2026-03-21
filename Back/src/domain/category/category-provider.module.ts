import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryRepository } from './infra/persistence/category.repository';
import { CategoryAthleteTypeOrmEntity } from './infra/persistence/entities/category-athlete.typeorm-entity';
import { CategoryTypeOrmEntity } from './infra/persistence/entities/category.typeorm-entity';
import { ICategoryRepository } from './repository/ICategoryRepository.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoryTypeOrmEntity,
      CategoryAthleteTypeOrmEntity,
    ]),
  ],
  providers: [
    {
      provide: ICategoryRepository,
      useClass: CategoryRepository,
    },
  ],
  exports: [ICategoryRepository],
})
export class CategoryProviderModule {}
