import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it } from 'vitest';
import { CompetitionModule } from './competition.module';
import { CreateCompetitionUseCase } from './application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from './application/use-cases/get-competition.use-case';
import { ListCompetitionsUseCase } from './application/use-cases/list-competitions.use-case';
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
    expect(moduleRef.get(ICompetitionRepository)).toBeInstanceOf(
      CompetitionRepository,
    );
  });
});
