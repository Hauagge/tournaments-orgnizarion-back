import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it } from 'vitest';
import { AthleteTypeOrmEntity } from '../athlete/infra/persistence/entities/athlete.typeorm-entity';
import { CompetitionTypeOrmEntity } from '../competition/infra/persistence/entities/competition.typeorm-entity';
import { AddAthleteToTeamUseCase } from './application/use-cases/add-athlete-to-team.use-case';
import { CreateTeamUseCase } from './application/use-cases/create-team.use-case';
import { ListTeamsByCompetitionUseCase } from './application/use-cases/list-teams-by-competition.use-case';
import { RemoveAthleteFromTeamUseCase } from './application/use-cases/remove-athlete-from-team.use-case';
import { UpdateTeamUseCase } from './application/use-cases/update-team.use-case';
import { TeamTypeOrmEntity } from './infra/persistence/entities/team.typeorm-entity';
import { TeamRepository } from './infra/persistence/team.repository';
import { ITeamRepository } from './repository/ITeamRepository.repository';
import { TeamModule } from './team.module';

describe('TeamModule', () => {
  it('should expose use cases and bind repository contract', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TeamModule],
    })
      .overrideProvider(getRepositoryToken(TeamTypeOrmEntity))
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

    expect(moduleRef.get(CreateTeamUseCase)).toBeInstanceOf(CreateTeamUseCase);
    expect(moduleRef.get(UpdateTeamUseCase)).toBeInstanceOf(UpdateTeamUseCase);
    expect(moduleRef.get(ListTeamsByCompetitionUseCase)).toBeInstanceOf(
      ListTeamsByCompetitionUseCase,
    );
    expect(moduleRef.get(AddAthleteToTeamUseCase)).toBeInstanceOf(
      AddAthleteToTeamUseCase,
    );
    expect(moduleRef.get(RemoveAthleteFromTeamUseCase)).toBeInstanceOf(
      RemoveAthleteFromTeamUseCase,
    );
    expect(moduleRef.get(ITeamRepository)).toBeInstanceOf(TeamRepository);
  });
});
