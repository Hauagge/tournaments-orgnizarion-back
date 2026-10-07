import { describe, expect, it } from 'vitest';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { AreaQueueItemStatus } from '../../../domain/value-objects/area-queue-item-status.enum';
import { AreaQueueFightDetailsRow } from '../types/area-queue-fight-details-row.type';
import { AreaMapper } from './area.mapper';

const makeRow = (
  override: Partial<AreaQueueFightDetailsRow> = {},
): AreaQueueFightDetailsRow => ({
  queueItemId: '277',
  fightId: '608',
  position: '6',
  queueStatus: AreaQueueItemStatus.QUEUED,
  fightStatus: FightStatus.PENDING,
  athleteAId: '586',
  athleteAName: 'Gabriel Santos',
  athleteBId: '583',
  athleteBName: 'Lucas Silva',
  keyGroupId: null,
  orderIndex: '3',
  ...override,
});

describe('AreaMapper.queueFightDetailsToDomain', () => {
  it('converte os ids da linha crua para numero', () => {
    const details = AreaMapper.queueFightDetailsToDomain(makeRow());

    expect(details).toMatchObject({
      queueItemId: 277,
      fightId: 608,
      position: 6,
      athleteAId: 586,
      athleteBId: 583,
      orderIndex: 3,
    });
  });

  it('mantem nulo o atleta ainda nao definido, em vez de virar id 0', () => {
    const details = AreaMapper.queueFightDetailsToDomain(
      makeRow({
        athleteAId: null,
        athleteAName: null,
        athleteBId: null,
        athleteBName: null,
      }),
    );

    expect(details.athleteAId).toBeNull();
    expect(details.athleteBId).toBeNull();
  });
});
