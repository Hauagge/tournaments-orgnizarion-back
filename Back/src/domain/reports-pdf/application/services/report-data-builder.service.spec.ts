import { describe, expect, it } from 'vitest';
import { CategoryPodiumService } from '@/domain/fight/application/services/category-podium.service';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { KeyGroupReportFightView } from '@/domain/key-group/repository/IKeyGroupRepository.repository';
import { makeCompetition } from '../../../../../test/factories';
import {
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
  InMemoryKeyGroupRepository,
} from '../../../../../test/repositories/in-memory';
import { ReportDataBuilderService } from './report-data-builder.service';

const NAMES: Record<number, string> = {
  1: 'Ana',
  2: 'Bia',
  3: 'Carla',
  4: 'Duda',
};

/**
 * Chave de 4 do modo chave, como gravada no banco: duas semifinais e a final,
 * sem disputa de terceiro. Semis 1x3 e 2x4; Ana vence a final contra Bia.
 */
const FIGHTS = [
  { id: 25, a: 1, b: 3, winner: 1, round: 1, order: 1, next: 27 },
  { id: 26, a: 2, b: 4, winner: 2, round: 1, order: 2, next: 27 },
  { id: 27, a: 1, b: 2, winner: 1, round: 2, order: 3, next: null },
];

function reportFight(fight: (typeof FIGHTS)[number]): KeyGroupReportFightView {
  return {
    id: fight.id,
    keyGroupId: 7,
    areaId: 1,
    areaName: 'Area 1',
    athleteAId: fight.a,
    athleteAName: NAMES[fight.a],
    academyAName: 'PJA',
    athleteBId: fight.b,
    athleteBName: NAMES[fight.b],
    academyBName: 'PJA',
    status: FightStatus.FINISHED,
    winnerAthleteId: fight.winner,
    winType: 'POINTS',
    orderIndex: fight.order,
  };
}

function fightEntity(fight: (typeof FIGHTS)[number]) {
  return FightEntity.restore({
    id: fight.id,
    competitionId: 1,
    categoryId: null,
    keyGroupId: 7,
    round: fight.round,
    order: fight.order,
    areaId: 1,
    areaName: 'Area 1',
    status: FightStatus.FINISHED,
    athleteAId: fight.a,
    athleteBId: fight.b,
    winnerId: fight.winner,
    loserId: fight.winner === fight.a ? fight.b : fight.a,
    nextFightId: fight.next,
    winType: 'POINTS',
    startedAt: null,
    finishedAt: null,
  } as never);
}

function setup() {
  const keyGroupRepository = new InMemoryKeyGroupRepository();
  keyGroupRepository.setReportViews([
    {
      id: 7,
      competitionId: 1,
      categoryId: null,
      categoryName: null,
      name: null,
      status: 'OPEN',
      createdAt: new Date('2026-08-27T00:00:00.000Z'),
      members: [1, 2, 3, 4].map((id) => ({
        id,
        fullName: NAMES[id],
        birthDate: new Date('2015-01-01T00:00:00.000Z'),
        belt: 'BRANCA',
        academyName: 'PJA',
      })),
      fights: FIGHTS.map(reportFight),
    },
  ]);

  return new ReportDataBuilderService(
    new InMemoryCompetitionRepository([makeCompetition({ id: 1 })]),
    keyGroupRepository,
    new InMemoryFightRepository(FIGHTS.map(fightEntity)),
    new CategoryPodiumService(),
  );
}

describe('ReportDataBuilderService', () => {
  it('draws the final with the real finalists and winner', async () => {
    const report = await setup().build({
      competitionId: 1,
      includeResults: true,
    });

    expect(report.brackets[0].stage.final).toMatchObject({
      athleteA: 'Ana',
      athleteB: 'Bia',
      areaName: 'Area 1',
      winner: 'Ana',
      isPlaceholder: false,
    });
  });

  it('fills the podium from the bracket: two thirds, no third-place fight', async () => {
    const report = await setup().build({
      competitionId: 1,
      includeResults: true,
    });

    expect(report.brackets[0].podium).toEqual([
      { place: '1º', athleteName: 'Ana' },
      { place: '2º', athleteName: 'Bia' },
      { place: '3º', athleteName: 'Carla' },
      { place: '3º', athleteName: 'Duda' },
    ]);
  });

  it('leaves the podium blank for manual filling without results', async () => {
    const report = await setup().build({
      competitionId: 1,
      includeResults: false,
    });

    expect(report.brackets[0].podium).toEqual([
      { place: '1º', athleteName: null },
      { place: '2º', athleteName: null },
      { place: '3º', athleteName: null },
      { place: '3º', athleteName: null },
    ]);
    expect(report.brackets[0].stage.final.winner).toBeNull();
  });
});
