import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it } from 'vitest';
import { AthleteTypeOrmEntity } from '../athlete/infra/persistence/entities/athlete.typeorm-entity';
import { CompetitionTypeOrmEntity } from '../competition/infra/persistence/entities/competition.typeorm-entity';
import { LinkAthleteToAcademyUseCase } from './application/use-cases/add-athlete-to-academy.use-case';
import { CreateAcademyUseCase } from './application/use-cases/create-academy.use-case';
import { ListAcademiesByCompetitionUseCase } from './application/use-cases/list-academies-by-competition.use-case';
import { UnlinkAthleteFromAcademyUseCase } from './application/use-cases/remove-athlete-from-academy.use-case';
import { UpdateAcademyUseCase } from './application/use-cases/update-academy.use-case';
import { AcademyTypeOrmEntity } from './infra/persistence/entities/academy.typeorm-entity';
import { AcademyRepository } from './infra/persistence/academy.repository';
import { IAcademyRepository } from './repository/IAcademyRepository.repository';
import { AcademyModule } from './academy.module';

describe('AcademyModule', () => {
  it('should expose use cases and bind repository contract', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AcademyModule],
    })
      .overrideProvider(getRepositoryToken(AcademyTypeOrmEntity))
      .useValue({
        create: () => undefined,
        save: async () => undefined,
        update: async () => ({ affected: 1 }),
        findOneBy: async () => null,
        findBy: async () => [],
        find: async () => [],
      })
      .overrideProvider(getRepositoryToken(AthleteTypeOrmEntity))
      .useValue({
        create: () => undefined,
        save: async () => undefined,
        update: async () => undefined,
        findOneBy: async () => null,
        find: async () => [],
      })
      .overrideProvider(getRepositoryToken(CompetitionTypeOrmEntity))
      .useValue({
        create: () => undefined,
        save: async () => undefined,
        update: async () => undefined,
        findOneBy: async () => null,
        findAndCount: async () => [[], 0],
      })
      .compile();

    expect(moduleRef.get(CreateAcademyUseCase)).toBeInstanceOf(CreateAcademyUseCase);
    expect(moduleRef.get(UpdateAcademyUseCase)).toBeInstanceOf(UpdateAcademyUseCase);
    expect(moduleRef.get(ListAcademiesByCompetitionUseCase)).toBeInstanceOf(
      ListAcademiesByCompetitionUseCase,
    );
    expect(moduleRef.get(LinkAthleteToAcademyUseCase)).toBeInstanceOf(
      LinkAthleteToAcademyUseCase,
    );
    expect(moduleRef.get(UnlinkAthleteFromAcademyUseCase)).toBeInstanceOf(
      UnlinkAthleteFromAcademyUseCase,
    );
    expect(moduleRef.get(IAcademyRepository)).toBeInstanceOf(AcademyRepository);
  });
});
