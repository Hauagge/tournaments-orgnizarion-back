import { beforeEach, describe, expect, it } from 'vitest';
import { DomainEvent, EventBus } from '@/core/events/event-bus.interface';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { InMemoryFightRepository } from '../../../../../test/repositories/in-memory';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { SwapFightSidesUseCase } from './swap-fight-sides.use-case';

class RecordingEventBus implements EventBus {
  public published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }

  subscribe(): () => void {
    return () => {};
  }
}

function makeFight(
  overrides: Partial<Parameters<typeof FightEntity.restore>[0]> = {},
) {
  return FightEntity.restore({
    id: 1,
    competitionId: 1,
    categoryId: 1,
    keyGroupId: 7,
    round: 1,
    order: 1,
    areaId: 5,
    areaName: 'Area 1',
    status: FightStatus.PENDING,
    athleteAId: 10,
    athleteBId: 20,
    winType: null,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  });
}

describe('SwapFightSidesUseCase', () => {
  let fightRepository: InMemoryFightRepository;
  let eventBus: RecordingEventBus;

  function makeUseCase(fights: FightEntity[]) {
    fightRepository = new InMemoryFightRepository(fights);
    return new SwapFightSidesUseCase(fightRepository, eventBus);
  }

  beforeEach(() => {
    eventBus = new RecordingEventBus();
  });

  it('troca o atleta da esquerda com o da direita e avisa a area', async () => {
    const useCase = makeUseCase([makeFight()]);

    const result = await useCase.execute({ fightId: 1 });

    expect(result.athleteAId).toBe(20);
    expect(result.athleteBId).toBe(10);
    expect((await fightRepository.findById(1))?.athleteAId).toBe(20);
    expect(eventBus.published).toEqual([
      expect.objectContaining({
        name: 'queue.updated',
        payload: expect.objectContaining({
          competitionId: 1,
          areaId: 5,
          fightId: 1,
        }),
      }),
    ]);
  });

  it('troca luta chamada sem mudar o status', async () => {
    const useCase = makeUseCase([makeFight({ status: FightStatus.CALLED })]);

    const result = await useCase.execute({ fightId: 1 });

    expect(result.status).toBe(FightStatus.CALLED);
    expect(result.athleteAId).toBe(20);
  });

  it('inverte o lado de destino das lutas que alimentam a luta trocada', async () => {
    // Final (id 3) ja tem o vencedor da L1 no lado A; a L2 ainda vai mandar
    // o vencedor para o lado B. Depois da troca, a L2 precisa mandar para o A.
    const useCase = makeUseCase([
      makeFight({
        id: 1,
        status: FightStatus.FINISHED,
        nextFightId: 3,
        nextFightSlot: 'A',
      }),
      makeFight({
        id: 2,
        athleteAId: 30,
        athleteBId: 40,
        nextFightId: 3,
        nextFightSlot: 'B',
      }),
      makeFight({
        id: 3,
        round: 2,
        athleteAId: 10,
        athleteBId: null,
      }),
      makeFight({ id: 4, nextFightId: 99, nextFightSlot: 'A' }),
    ]);

    await useCase.execute({ fightId: 3 });

    expect((await fightRepository.findById(3))?.athleteAId).toBeNull();
    expect((await fightRepository.findById(3))?.athleteBId).toBe(10);
    expect((await fightRepository.findById(1))?.nextFightSlot).toBe('B');
    expect((await fightRepository.findById(2))?.nextFightSlot).toBe('A');
    expect((await fightRepository.findById(4))?.nextFightSlot).toBe('A');
  });

  it('inverte tambem o lado de destino do perdedor (repescagem)', async () => {
    const useCase = makeUseCase([
      makeFight({ id: 1, loserNextFightId: 2, loserNextFightSlot: 'B' }),
      makeFight({ id: 2, athleteAId: 30, athleteBId: null }),
    ]);

    await useCase.execute({ fightId: 2 });

    expect((await fightRepository.findById(1))?.loserNextFightSlot).toBe('A');
  });

  it.each([
    FightStatus.IN_PROGRESS,
    FightStatus.FINISHED,
    FightStatus.CANCELED,
  ])('recusa trocar luta %s', async (status) => {
    const useCase = makeUseCase([makeFight({ status })]);

    await expect(useCase.execute({ fightId: 1 })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect((await fightRepository.findById(1))?.athleteAId).toBe(10);
    expect(eventBus.published).toEqual([]);
  });

  it('falha com NotFoundError quando a luta nao existe', async () => {
    const useCase = makeUseCase([]);

    await expect(useCase.execute({ fightId: 1 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
