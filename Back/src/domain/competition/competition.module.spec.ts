import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it } from 'vitest';
import { AthleteTypeOrmEntity } from '../athlete/infra/persistence/entities/athlete.typeorm-entity';
import { AcademyTypeOrmEntity } from '../academy/infra/persistence/entities/academy.typeorm-entity';
import { CompetitionModule } from './competition.module';
import { CreateCompetitionUseCase } from './application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from './application/use-cases/get-competition.use-case';
import { ImportAthletesUseCase } from './application/use-cases/import-athletes.use-case';
import { ListCompetitionsUseCase } from './application/use-cases/list-competitions.use-case';
import { PreviewAthleteImportUseCase } from './application/use-cases/preview-athlete-import.use-case';
import { UpdateCompetitionSettingsUseCase } from './application/use-cases/update-competition-settings.use-case';
import { CompetitionRepository } from './infra/persistence/competition.repository';
import { CompetitionTypeOrmEntity } from './infra/persistence/entities/competition.typeorm-entity';
import { ICompetitionRepository } from './repository/ICompetitionRepository.repository';

describe('CompetitionModule', () => {
  it('should expose use cases and bind repository contract to TypeOrm implementation', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CompetitionModule],
    })
      .overrideProvider(getRepositoryToken(CompetitionTypeOrmEntity))
      .useValue({
        create: () => undefined,
        save: async () => undefined,
        update: async () => undefined,
        findOneBy: async () => null,
        findAndCount: async () => [[], 0],
      })
      .overrideProvider(getRepositoryToken(AthleteTypeOrmEntity))
      .useValue({
        create: () => undefined,
        save: async () => undefined,
        update: async () => undefined,
        findOneBy: async () => null,
        find: async () => [],
      })
      .overrideProvider(getRepositoryToken(AcademyTypeOrmEntity))
      .useValue({
        create: () => undefined,
        save: async () => undefined,
        findOneBy: async () => null,
      })
      .compile();

    expect(moduleRef.get(CreateCompetitionUseCase)).toBeInstanceOf(
      CreateCompetitionUseCase,
    );
    expect(moduleRef.get(UpdateCompetitionSettingsUseCase)).toBeInstanceOf(
      UpdateCompetitionSettingsUseCase,
    );
    expect(moduleRef.get(GetCompetitionUseCase)).toBeInstanceOf(
      GetCompetitionUseCase,
    );
    expect(moduleRef.get(ListCompetitionsUseCase)).toBeInstanceOf(
      ListCompetitionsUseCase,
    );
    expect(moduleRef.get(PreviewAthleteImportUseCase)).toBeInstanceOf(
      PreviewAthleteImportUseCase,
    );
    expect(moduleRef.get(ImportAthletesUseCase)).toBeInstanceOf(
      ImportAthletesUseCase,
    );
    expect(moduleRef.get(ICompetitionRepository)).toBeInstanceOf(
      CompetitionRepository,
    );
  });
});
