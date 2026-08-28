import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it } from 'vitest';
import { CoreAuthModule } from '@/core/auth/core-auth.module';
import { AcademyTypeOrmEntity } from '../academy/infra/persistence/entities/academy.typeorm-entity';
import { AthleteTypeOrmEntity } from '../athlete/infra/persistence/entities/athlete.typeorm-entity';
import { UserCompetitionTypeOrmEntity } from '../auth/entities/user-competition.typeorm-entity';
import { User } from '../auth/entities/user.typeorm-entity';
import { CategoryAthleteTypeOrmEntity } from '../category/infra/persistence/entities/category-athlete.typeorm-entity';
import { CategoryTypeOrmEntity } from '../category/infra/persistence/entities/category.typeorm-entity';
import { CompetitionTypeOrmEntity } from '../competition/infra/persistence/entities/competition.typeorm-entity';
import { AreaTypeOrmEntity } from '../area/infra/persistence/entities/area.typeorm-entity';
import { FightTypeOrmEntity } from '../fight/entities/fight.typeorm-entity';
import { KeyGroupMemberTypeOrmEntity } from '../key-group/infra/persistence/entities/key-group-member.typeorm-entity';
import { KeyGroupTypeOrmEntity } from '../key-group/infra/persistence/entities/key-group.typeorm-entity';
import { WeighInTypeOrmEntity } from '../weighin/infra/persistence/entities/weigh-in.typeorm-entity';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { ChampionAcademiesReportUseCase } from './application/use-cases/champion-academies-report.use-case';
import { ReportsController } from './infra/http/reports.controller';
import { ReportsModule } from './reports.module';

const repositoryStub = {
  create: () => undefined,
  save: async () => undefined,
  update: async () => undefined,
  find: async () => [],
  findOne: async () => null,
  findOneBy: async () => null,
  findBy: async () => [],
  createQueryBuilder: () => ({}),
};

describe('ReportsModule', () => {
  it('resolves the champion academies report endpoint', async () => {
    const builder = Test.createTestingModule({
      imports: [ReportsModule, CoreAuthModule],
    });

    for (const entity of [
      CompetitionTypeOrmEntity,
      CategoryTypeOrmEntity,
      CategoryAthleteTypeOrmEntity,
      AthleteTypeOrmEntity,
      AcademyTypeOrmEntity,
      User,
      UserCompetitionTypeOrmEntity,
      KeyGroupTypeOrmEntity,
      KeyGroupMemberTypeOrmEntity,
      FightTypeOrmEntity,
      AreaTypeOrmEntity,
      WeighInTypeOrmEntity,
    ]) {
      builder.overrideProvider(getRepositoryToken(entity)).useValue(repositoryStub);
    }

    const moduleRef = await builder.compile();

    expect(moduleRef.get(ChampionAcademiesReportUseCase)).toBeInstanceOf(
      ChampionAcademiesReportUseCase,
    );
    expect(moduleRef.get(ReportsController)).toBeInstanceOf(ReportsController);
    expect(moduleRef.get(CompetitionAccessGuard)).toBeInstanceOf(
      CompetitionAccessGuard,
    );
  });
});
