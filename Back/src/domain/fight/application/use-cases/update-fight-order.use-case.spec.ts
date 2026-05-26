import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { DomainEvent, EventBus } from '@/core/events/event-bus.interface';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { Competition } from '@/domain/competition/domain/entities/competition.entity';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeCompetition } from '../../../../../test/factories';
import { UpdateFightOrderUseCase } from './update-fight-order.use-case';

class InMemoryCompetitionRepository implements ICompetitionRepository {
  constructor(private readonly competitions: Competition[]) {}

  async create(competition: Competition): Promise<Competition> {
    return competition;
  }

  async update(competition: Competition): Promise<Competition> {
    return competition;
  }

  async findById(id: number): Promise<Competition | null> {
    return (
      this.competitions.find((competition) => competition.id === id) ?? null
    );
  }

  async list(): Promise<[Competition[], number]> {
    return [this.competitions, this.competitions.length];
  }
}

class InMemoryUserCompetitionRepository
  implements IUserCompetitionRepository
{
  constructor(private readonly hasAccess = true) {}

  async listByCompetitionId(): Promise<any[]> {
    return [];
  }

  async findByUserIdAndCompetitionId(): Promise<any | null> {
    return this.hasAccess ? { id: 1 } : null;
  }

  async grantAccess(): Promise<void> {
    return;
  }

  async revokeAccess(): Promise<void> {
    return;
  }
}

class InMemoryFightRepository implements IFightRepository {
  public updateOrderCalls: Array<
    Array<{ fightId: number; orderIndex: number }>
  > = [];

  constructor(private fights: FightEntity[]) {}

  async create(fight: FightEntity): Promise<FightEntity> {
    this.fights = [...this.fights, fight];
    return fight;
  }

  async createMany(fights: FightEntity[]): Promise<FightEntity[]> {
    this.fights = [...this.fights, ...fights];
    return fights;
  }

  async update(fight: FightEntity): Promise<FightEntity> {
    this.fights = this.fights.map((current) =>
      current.id === fight.id ? fight : current,
    );
    return fight;
  }

  async updateMany(fights: FightEntity[]): Promise<FightEntity[]> {
    for (const fight of fights) {
      await this.update(fight);
    }
    return fights;
  }

  async findById(id: number): Promise<FightEntity | null> {
    return this.fights.find((fight) => fight.id === id) ?? null;
  }

  async listByCompetitionId(input: {
    competitionId: number;
    status?: FightStatus;
    categoryId?: number;
    round?: number;
    areaId?: number;
    athleteName?: string;
  }): Promise<FightEntity[]> {
    return this.fights
      .filter(
        (fight) =>
          fight.competitionId === input.competitionId &&
          (input.status ? fight.status === input.status : true),
      )
      .sort((left, right) => {
        if (left.orderIndex !== right.orderIndex) {
          return left.orderIndex - right.orderIndex;
        }

        return (left.id ?? 0) - (right.id ?? 0);
      });
  }

  async listByKeyGroupId(keyGroupId: number): Promise<FightEntity[]> {
    return this.fights.filter((fight) => fight.keyGroupId === keyGroupId);
  }

  async listByCategoryId(input: {
    competitionId: number;
    categoryId: number;
  }): Promise<FightEntity[]> {
    return this.fights.filter(
      (fight) =>
        fight.competitionId === input.competitionId &&
        fight.categoryId === input.categoryId,
    );
  }

  async listQueueByAreaId(areaId: number): Promise<FightEntity[]> {
    return this.fights.filter((fight) => fight.areaId === areaId);
  }

  async assignAreas(): Promise<void> {
    return;
  }

  async updateOrder(
    items: Array<{ fightId: number; orderIndex: number }>,
  ): Promise<void> {
    this.updateOrderCalls.push(items);

    const orderByFightId = new Map(
      items.map((item) => [item.fightId, item.orderIndex]),
    );

    this.fights = this.fights.map((fight) =>
      orderByFightId.has(fight.id as number)
        ? FightEntity.restore({
            ...fight.toJSON(),
            orderIndex: orderByFightId.get(fight.id as number) as number,
          })
        : fight,
    );
  }

  async countByCompetitionId(competitionId: number): Promise<number> {
    return this.fights.filter((fight) => fight.competitionId === competitionId)
      .length;
  }

  async delete(id: number): Promise<void> {
    this.fights = this.fights.filter((fight) => fight.id !== id);
  }
}

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
  let userCompetitionRepository: InMemoryUserCompetitionRepository;
  let fightRepository: InMemoryFightRepository;
  let eventBus: InMemoryEventBus;
  let useCase: UpdateFightOrderUseCase;

  beforeEach(() => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1 }),
    ]);
    userCompetitionRepository = new InMemoryUserCompetitionRepository(true);
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
    expect(fightRepository.updateOrderCalls).toEqual([result.items]);

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
    userCompetitionRepository = new InMemoryUserCompetitionRepository(false);
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
