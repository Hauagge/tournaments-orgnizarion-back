import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { JwtAuthGuard } from '@/core/auth/infra/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/infra/guards/roles.guard';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { CreateManualFightUseCase } from '../../application/use-cases/create-manual-fight.use-case';
import { DeleteFightUseCase } from '../../application/use-cases/delete-fight.use-case';
import { FinishFightUseCase } from '../../application/use-cases/finish-fight.use-case';
import { GenerateFightsUseCase } from '../../application/use-cases/generate-fights.use-case';
import { ListFightsUseCase } from '../../application/use-cases/list-fights.use-case';
import { MarkFightWinnerUseCase } from '../../application/use-cases/mark-fight-winner.use-case';
import { StartFightUseCase } from '../../application/use-cases/start-fight.use-case';
import { SetFightCalledUseCase } from '../../application/use-cases/set-fight-called.use-case';
import { SwapFightSidesUseCase } from '../../application/use-cases/swap-fight-sides.use-case';
import { UpdateFightOrderUseCase } from '../../application/use-cases/update-fight-order.use-case';
import { UpdateFightUseCase } from '../../application/use-cases/update-fight.use-case';
import { FightController } from './fight.controller';

// F5: PATCH /competitions/:id/fights/order era declarada depois de
// PATCH /competitions/:competitionId/fights/:fightId no controller, entao o
// Express casava "order" como :fightId primeiro e o zod rejeitava (400) antes
// de a rota certa ser tentada.
describe('FightController route order (integration)', () => {
  let app: INestApplication;
  let updateFightOrderUseCase: { execute: ReturnType<typeof vi.fn> };
  let markFightWinnerUseCase: { execute: ReturnType<typeof vi.fn> };
  let swapFightSidesUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    updateFightOrderUseCase = { execute: vi.fn().mockResolvedValue({}) };
    markFightWinnerUseCase = {
      execute: vi.fn().mockResolvedValue({
        fight: { id: 2, status: 'FINISHED', winnerId: 3, loserId: null },
        nextFight: null,
        categoryChampion: null,
      }),
    };

    swapFightSidesUseCase = {
      execute: vi.fn().mockResolvedValue({
        toJSON: () => ({ id: 2, athleteAId: 20, athleteBId: 10 }),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [FightController],
      providers: [
        { provide: GenerateFightsUseCase, useValue: { execute: vi.fn() } },
        { provide: StartFightUseCase, useValue: { execute: vi.fn() } },
        { provide: SetFightCalledUseCase, useValue: { execute: vi.fn() } },
        { provide: FinishFightUseCase, useValue: { execute: vi.fn() } },
        { provide: ListFightsUseCase, useValue: { execute: vi.fn() } },
        { provide: UpdateFightOrderUseCase, useValue: updateFightOrderUseCase },
        { provide: CreateManualFightUseCase, useValue: { execute: vi.fn() } },
        { provide: MarkFightWinnerUseCase, useValue: markFightWinnerUseCase },
        { provide: UpdateFightUseCase, useValue: { execute: vi.fn() } },
        { provide: DeleteFightUseCase, useValue: { execute: vi.fn() } },
        { provide: SwapFightSidesUseCase, useValue: swapFightSidesUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: import('@nestjs/common').ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = {
            sub: 1,
            username: 'desk',
            role: AuthRole.ORGANIZATION,
            academyId: null,
            competitionIds: [1],
            exp: Math.floor(Date.now() / 1000) + 3600,
          };
          return true;
        },
      })
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

  it('routes PATCH /competitions/:id/fights/order to the order use case instead of the :fightId route', async () => {
    const response = await request(app.getHttpServer())
      .patch('/competitions/1/fights/order')
      .send({ items: [{ fightId: 10, orderIndex: 1 }] });

    expect(response.status).toBeLessThan(400);
    expect(updateFightOrderUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        competitionId: 1,
        items: [{ fightId: 10, orderIndex: 1 }],
      }),
    );
  });

  // F6: cobertura que faltava para o controller repassar winType ao use case.
  it('passes winType through to MarkFightWinnerUseCase', async () => {
    const response = await request(app.getHttpServer())
      .patch('/competitions/1/fights/2/winner')
      .send({ winnerId: 3, winType: 'SUBMISSION' });

    expect(response.status).toBeLessThan(400);
    expect(markFightWinnerUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        competitionId: 1,
        fightId: 2,
        winnerId: 3,
        winType: 'SUBMISSION',
      }),
    );
  });

  it('POST /fights/:id/swap-sides troca os lados da luta', async () => {
    const response = await request(app.getHttpServer())
      .post('/fights/2/swap-sides')
      .expect(201);

    expect(swapFightSidesUseCase.execute).toHaveBeenCalledWith({ fightId: 2 });
    expect(response.body.data).toEqual({
      id: 2,
      athleteAId: 20,
      athleteBId: 10,
    });
  });
});
