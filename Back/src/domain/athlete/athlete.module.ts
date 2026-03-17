import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateAthleteUseCase } from './application/use-cases/create-athlete.use-case';
import { GetAthleteUseCase } from './application/use-cases/get-athlete.use-case';
import { SearchAthletesUseCase } from './application/use-cases/search-athletes.use-case';
import { UpdateAthleteUseCase } from './application/use-cases/update-athlete.use-case';
import { AthleteController } from './infra/http/athlete.controller';
import { AthleteRepository } from './infra/persistence/athlete.repository';
import { AthleteTypeOrmEntity } from './infra/persistence/entities/athlete.typeorm-entity';
import { IAthleteRepository } from './repository/IAthleteRepository.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AthleteTypeOrmEntity])],
  controllers: [AthleteController],
  providers: [
    CreateAthleteUseCase,
    UpdateAthleteUseCase,
    GetAthleteUseCase,
    SearchAthletesUseCase,
    {
      provide: IAthleteRepository,
      useClass: AthleteRepository,
    },
  ],
  exports: [
    CreateAthleteUseCase,
    UpdateAthleteUseCase,
    GetAthleteUseCase,
    SearchAthletesUseCase,
    IAthleteRepository,
  ],
})
export class AthleteModule {}
