import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { JwtAuthGuard } from '@/core/auth/infra/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/infra/guards/roles.guard';
import { AddUserToCompetitionUseCase } from '../../application/use-cases/add-user-to-competition.use-case';
import { CreateCompetitionUseCase } from '../../application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from '../../application/use-cases/get-competition.use-case';
import { GetDashboardSummaryUseCase } from '../../application/use-cases/get-dashboard-summary.use-case';
import { ImportAthletesUseCase } from '../../application/use-cases/import-athletes.use-case';
import { ListCompetitionUsersUseCase } from '../../application/use-cases/list-competition-users.use-case';
import { ListCompetitionsUseCase } from '../../application/use-cases/list-competitions.use-case';
import { PreviewAthleteImportUseCase } from '../../application/use-cases/preview-athlete-import.use-case';
import { RemoveUserFromCompetitionUseCase } from '../../application/use-cases/remove-user-from-competition.use-case';
import { UpdateCompetitionSettingsUseCase } from '../../application/use-cases/update-competition-settings.use-case';
import { CompetitionController } from './competition.controller';

const MAX_IMPORT_CSV_BYTES = 5 * 1024 * 1024; // must match the controller's configured limit

describe('CompetitionController import CSV size limit (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CompetitionController],
      providers: [
        { provide: CreateCompetitionUseCase, useValue: { execute: vi.fn() } },
        {
          provide: UpdateCompetitionSettingsUseCase,
          useValue: { execute: vi.fn() },
        },
        { provide: GetCompetitionUseCase, useValue: { execute: vi.fn() } },
        {
          provide: ListCompetitionUsersUseCase,
          useValue: { execute: vi.fn() },
        },
        { provide: ListCompetitionsUseCase, useValue: { execute: vi.fn() } },
        {
          provide: PreviewAthleteImportUseCase,
          useValue: { execute: vi.fn() },
        },
        { provide: ImportAthletesUseCase, useValue: { execute: vi.fn() } },
        {
          provide: AddUserToCompetitionUseCase,
          useValue: { execute: vi.fn() },
        },
        {
          provide: RemoveUserFromCompetitionUseCase,
          useValue: { execute: vi.fn() },
        },
        {
          provide: GetDashboardSummaryUseCase,
          useValue: { execute: vi.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CompetitionAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a csv file larger than the configured limit with a handled 4xx response', async () => {
    const oversizedBuffer = Buffer.alloc(MAX_IMPORT_CSV_BYTES + 1, 'a');

    const response = await request(app.getHttpServer())
      .post('/competitions/1/import/athletes')
      .attach('file', oversizedBuffer, 'athletes.csv');

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.body).toBeTruthy();
  });

  it('accepts a csv file within the configured limit', async () => {
    const importAthletesUseCase = app.get(ImportAthletesUseCase);
    vi.mocked(importAthletesUseCase.execute).mockResolvedValue({
      importedCount: 1,
      failedCount: 0,
      athletes: [],
      errors: [],
    });

    const smallBuffer = Buffer.from(
      'fullName,birthDate,belt,weight\nAna,2010-05-10,white,65',
    );

    const response = await request(app.getHttpServer())
      .post('/competitions/1/import/athletes')
      .attach('file', smallBuffer, 'athletes.csv');

    expect(response.status).toBeLessThan(400);
  });
});
