import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEvent, EventBus } from '@/core/events/event-bus.interface';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeCompetition } from '../../../../../test/factories';
import {
  InMemoryAuthRepository,
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
} from '../../../../../test/repositories/in-memory';
import { UpdateFightOrderUseCase } from './update-fight-order.use-case';

class InMemoryEventBus implements EventBus {
  public events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  subscribe(): () => void {
    return () => undefined;
  }
}

function makeFight(input: {
  id: number;
  competitionId?: number;
  categoryId?: number | null;
  keyGroupId?: number | null;
  orderIndex?: number;
}) {
  return FightEntity.restore({
    id: input.id,
    competitionId: input.competitionId ?? 1,
    categoryId: input.categoryId ?? 10,
    keyGroupId: input.keyGroupId ?? 100,
    areaId: null,
    areaName: null,
    status: FightStatus.WAITING,
    athleteAId: input.id * 10,
    athleteBId: input.id * 10 + 1,
    winnerAthleteId: null,
    winType: null,
    startedAt: null,
    finishedAt: null,
    orderIndex: input.orderIndex ?? input.id,
  });
}

describe('UpdateFightOrderUseCase', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let userCompetitionRepository: InMemoryAuthRepository;
  let fightRepository: InMemoryFightRepository;
  let eventBus: InMemoryEventBus;
  let useCase: UpdateFightOrderUseCase;

  beforeEach(async () => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1 }),
    ]);
    userCompetitionRepository = new InMemoryAuthRepository();
    await userCompetitionRepository.grantAccess({
      userId: 10,
      competitionId: 1,
      role: CompetitionAccessRole.OWNER,
    });
    fightRepository = new InMemoryFightRepository([
      makeFight({ id: 1, competitionId: 1, orderIndex: 1 }),
      makeFight({ id: 2, competitionId: 1, orderIndex: 2 }),
      makeFight({ id: 3, competitionId: 2, orderIndex: 1 }),
    ]);
    eventBus = new InMemoryEventBus();
    useCase = new UpdateFightOrderUseCase(
      competitionRepository,
      userCompetitionRepository,
      fightRepository,
      eventBus,
    );
  });

  it('updates fight order for the informed competition', async () => {
    const updateOrder = vi.spyOn(fightRepository, 'updateOrder');

    const result = await useCase.execute({
      currentUserId: 10,
      competitionId: 1,
      items: [
        { fightId: 1, orderIndex: 2 },
        { fightId: 2, orderIndex: 1 },
      ],
    });

    expect(result).toEqual({
      competitionId: 1,
      totalUpdated: 2,
      items: [
        { fightId: 2, orderIndex: 1 },
        { fightId: 1, orderIndex: 2 },
      ],
    });
    expect(updateOrder).toHaveBeenCalledWith(result.items);

    const fights = await fightRepository.listByCompetitionId({
      competitionId: 1,
    });

    expect(fights.map((fight) => fight.id)).toEqual([2, 1]);
    expect(eventBus.events).toHaveLength(1);
    expect(eventBus.events[0]).toMatchObject({
      name: 'fights.order.updated',
      payload: {
        competitionId: 1,
      },
    });
    expect(eventBus.events[0].occurredAt).toBeInstanceOf(Date);
  });

  it('throws when competition does not exist', async () => {
    await expect(() =>
      useCase.execute({
        currentUserId: 10,
        competitionId: 999,
        items: [{ fightId: 1, orderIndex: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws when authenticated user has no competition access', async () => {
    userCompetitionRepository = new InMemoryAuthRepository();
    useCase = new UpdateFightOrderUseCase(
      competitionRepository,
      userCompetitionRepository,
      fightRepository,
      eventBus,
    );

    await expect(() =>
      useCase.execute({
        currentUserId: 10,
        competitionId: 1,
        items: [{ fightId: 1, orderIndex: 1 }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when payload has duplicated fights', async () => {
    await expect(() =>
      useCase.execute({
        currentUserId: 10,
        competitionId: 1,
        items: [
          { fightId: 1, orderIndex: 1 },
          { fightId: 1, orderIndex: 2 },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws when payload has duplicated order indexes', async () => {
    await expect(() =>
      useCase.execute({
        currentUserId: 10,
        competitionId: 1,
        items: [
          { fightId: 1, orderIndex: 1 },
          { fightId: 2, orderIndex: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws when a fight does not belong to the informed competition', async () => {
    await expect(() =>
      useCase.execute({
        currentUserId: 10,
        competitionId: 1,
        items: [
          { fightId: 1, orderIndex: 1 },
          { fightId: 3, orderIndex: 2 },
        ],
      }),
    ).rejects.toMatchObject({
      response: {
        error: {
          details: {
            fightIds: [3],
          },
        },
      },
    });
  });
});
