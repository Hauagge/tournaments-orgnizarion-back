import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it } from 'vitest';
import { TeamTypeOrmEntity } from '../team/infra/persistence/entities/team.typeorm-entity';
import { WeighInTypeOrmEntity } from '../weighin/infra/persistence/entities/weigh-in.typeorm-entity';
import { AthleteModule } from './athlete.module';
import { CreateAthleteUseCase } from './application/use-cases/create-athlete.use-case';
import { GetAthleteUseCase } from './application/use-cases/get-athlete.use-case';
import { SearchAthletesUseCase } from './application/use-cases/search-athletes.use-case';
import { UpdateAthleteUseCase } from './application/use-cases/update-athlete.use-case';
import { AthleteRepository } from './infra/persistence/athlete.repository';
import { AthleteTypeOrmEntity } from './infra/persistence/entities/athlete.typeorm-entity';
import { IAthleteRepository } from './repository/IAthleteRepository.repository';

describe('AthleteModule', () => {
  it('should expose use cases and bind repository contract', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AthleteModule],
    })
      .overrideProvider(getRepositoryToken(AthleteTypeOrmEntity))
      .useValue({
        create: () => undefined,
        save: async () => undefined,
        update: async () => undefined,
        findOneBy: async () => null,
        find: async () => [],
      })
      .overrideProvider(getRepositoryToken(TeamTypeOrmEntity))
      .useValue({
        create: () => undefined,
        save: async () => undefined,
        update: async () => undefined,
        findOneBy: async () => null,
        findBy: async () => [],
        find: async () => [],
      })
      .overrideProvider(getRepositoryToken(WeighInTypeOrmEntity))
      .useValue({
        save: async () => undefined,
        findOneBy: async () => null,
        find: async () => [],
        create: () => undefined,
      })
      .compile();

    expect(moduleRef.get(CreateAthleteUseCase)).toBeInstanceOf(
      CreateAthleteUseCase,
    );
    expect(moduleRef.get(UpdateAthleteUseCase)).toBeInstanceOf(
      UpdateAthleteUseCase,
    );
    expect(moduleRef.get(GetAthleteUseCase)).toBeInstanceOf(GetAthleteUseCase);
    expect(moduleRef.get(SearchAthletesUseCase)).toBeInstanceOf(
      SearchAthletesUseCase,
    );
    expect(moduleRef.get(IAthleteRepository)).toBeInstanceOf(AthleteRepository);
  });
});
