import { describe, expect, it } from 'vitest';
import { CategoryPodiumService } from '@/domain/fight/application/services/category-podium.service';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { KeyGroup } from '@/domain/key-group/domain/entities/key-group.entity';
import { KeyGroupMember } from '@/domain/key-group/domain/entities/key-group-member.entity';
import { KeyGroupStatus } from '@/domain/key-group/domain/value-objects/key-group-status.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import {
  makeAcademy,
  makeAthlete,
  makeCategory,
  makeCompetition,
} from '../../../../../test/factories';
import {
  InMemoryAcademyRepository,
  InMemoryAthleteRepository,
  InMemoryCategoryRepository,
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
  InMemoryKeyGroupRepository,
} from '../../../../../test/repositories/in-memory';
import { CompetitionResultsUseCase } from './competition-results.use-case';

type FightOverrides = Partial<Parameters<typeof FightEntity.restore>[0]>;

function fight(overrides: FightOverrides = {}) {
  return FightEntity.restore({
    id: 1,
    competitionId: 1,
    categoryId: 10,
    keyGroupId: null,
    round: 1,
    order: 1,
    areaId: null,
    areaName: null,
    status: FightStatus.FINISHED,
    athleteAId: 1,
    athleteBId: 2,
    winnerId: 1,
    loserId: 2,
    winType: 'POINTS',
    startedAt: null,
    finishedAt: null,
    ...overrides,
  } as never);
}

/**
 * Chave de 4 na categoria 10: duas semifinais e a final, sem disputa de
 * terceiro — os dois perdedores de semifinal sao terceiros colocados.
 */
function bracketOfFour() {
  return [
    fight({
      id: 1,
      round: 1,
      order: 1,
      athleteAId: 1,
      athleteBId: 2,
      winnerId: 1,
      loserId: 2,
      nextFightId: 3,
      nextFightSlot: 'A',
    }),
    fight({
      id: 2,
      round: 1,
      order: 2,
      athleteAId: 3,
      athleteBId: 4,
      winnerId: 3,
      loserId: 4,
      nextFightId: 3,
      nextFightSlot: 'B',
    }),
    fight({
      id: 3,
      round: 2,
      order: 3,
      athleteAId: 1,
      athleteBId: 3,
      winnerId: 1,
      loserId: 3,
    }),
  ];
}

/** Modo chave: as lutas nao tem categoria, so a chave. */
function keysBracketOfFour(keyGroupId: number) {
  return bracketOfFour().map((item) =>
    FightEntity.restore({ ...item.toJSON(), categoryId: null, keyGroupId }),
  );
}

function makeKeyGroup(id: number, name: string | null) {
  return KeyGroup.restore({
    id,
    competitionId: 1,
    categoryId: null,
    name,
    status: KeyGroupStatus.READY,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
}

function membersOf(keyGroupId: number, athleteIds: number[]) {
  return athleteIds.map((athleteId) =>
    KeyGroupMember.restore({
      id: keyGroupId * 100 + athleteId,
      keyGroupId,
      athleteId,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
    }),
  );
}

function setup(
  fights: FightEntity[],
  keyGroups: KeyGroup[] = [],
  keyGroupMembers: KeyGroupMember[] = [],
) {
  const competition = makeCompetition({ id: 1 });
  const categories = [
    makeCategory({
      id: 10,
      competitionId: 1,
      name: 'Com lutas',
      belt: 'BRANCA',
    }),
    makeCategory({ id: 11, competitionId: 1, name: 'Sem lutas', belt: 'AZUL' }),
  ];
  const athletes = [1, 2, 3, 4, 5].map((id) =>
    makeAthlete({ id, fullName: `Atleta ${id}`, academyId: 7 }),
  );

  const useCase = new CompetitionResultsUseCase(
    new InMemoryCompetitionRepository([competition]),
    new InMemoryCategoryRepository(categories),
    new InMemoryAthleteRepository(athletes),
    new InMemoryAcademyRepository([
      makeAcademy({ id: 7, competitionId: 1, name: 'Academia Alfa' }),
    ]),
    new InMemoryFightRepository(fights),
    new InMemoryKeyGroupRepository(keyGroups, keyGroupMembers),
    new CategoryPodiumService(),
  );

  return { useCase };
}

describe('CompetitionResultsUseCase', () => {
  it('throws when the competition does not exist', async () => {
    const { useCase } = setup([]);

    await expect(useCase.execute({ competitionId: 99 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('builds the podium and resolves athlete and academy names', async () => {
    const { useCase } = setup(bracketOfFour());

    const report = await useCase.execute({ competitionId: 1 });

    expect(report.totalCategories).toBe(1);
    expect(report.decidedCategories).toBe(1);

    const [category] = report.categories;
    expect(category.categoryName).toBe('Com lutas');
    expect(category.decided).toBe(true);
    expect(category.first).toMatchObject({
      athleteId: 1,
      athleteName: 'Atleta 1',
      academyName: 'Academia Alfa',
    });
    expect(category.second?.athleteId).toBe(3);
    // Chave de 4: os dois perdedores de semifinal sao terceiros.
    expect(category.thirds.map((athlete) => athlete.athleteId).sort()).toEqual([
      2, 4,
    ]);
    expect(category.secondarySeries).toBeNull();
  });

  it('leaves out categories that have no fights', async () => {
    const { useCase } = setup(bracketOfFour());

    const report = await useCase.execute({ competitionId: 1 });

    expect(report.categories.map((category) => category.categoryId)).toEqual([
      10,
    ]);
  });

  it('filters by belt', async () => {
    const { useCase } = setup(bracketOfFour());

    await expect(
      useCase.execute({ competitionId: 1, belt: 'branca' }),
    ).resolves.toMatchObject({ totalCategories: 1 });
    await expect(
      useCase.execute({ competitionId: 1, belt: 'AZUL' }),
    ).resolves.toMatchObject({ totalCategories: 0 });
  });

  it('hides undecided categories when onlyDecided is set', async () => {
    const emAberto = bracketOfFour().slice(0, 2);
    emAberto.push(
      fight({
        id: 3,
        round: 2,
        order: 3,
        status: FightStatus.PENDING,
        winnerId: null,
        loserId: null,
      }),
    );
    const { useCase } = setup(emAberto);

    const todas = await useCase.execute({ competitionId: 1 });
    expect(todas.totalCategories).toBe(1);
    expect(todas.categories[0].decided).toBe(false);

    const somenteDecididas = await useCase.execute({
      competitionId: 1,
      onlyDecided: true,
    });
    expect(somenteDecididas.totalCategories).toBe(0);
  });

  it('exposes the silver series flagged as out of the academy ranking', async () => {
    // Estrutura real de uma chave de 5 no Ouro/Prata: 2 lutas de abertura, o 5o
    // atleta entra direto na Ouro (que resolve com um bye) e os 2 perdedores da
    // abertura formam a final da Prata.
    const { useCase } = setup([
      fight({
        id: 1,
        round: 1,
        order: 1,
        athleteAId: 1,
        athleteBId: 2,
        winnerId: 1,
        loserId: 2,
        nextFightId: 4,
        nextFightSlot: 'A',
        loserNextFightId: 5,
        loserNextFightSlot: 'A',
      }),
      fight({
        id: 2,
        round: 1,
        order: 2,
        athleteAId: 3,
        athleteBId: 4,
        winnerId: 3,
        loserId: 4,
        nextFightId: 3,
        nextFightSlot: 'A',
        loserNextFightId: 5,
        loserNextFightSlot: 'B',
      }),
      fight({
        id: 3,
        round: 2,
        order: 3,
        athleteAId: 3,
        athleteBId: 5,
        winnerId: 3,
        loserId: 5,
        nextFightId: 4,
        nextFightSlot: 'B',
      }),
      fight({
        id: 4,
        round: 3,
        order: 4,
        athleteAId: 1,
        athleteBId: 3,
        winnerId: 1,
        loserId: 3,
      }),
      fight({
        id: 5,
        round: 2,
        order: 5,
        athleteAId: 2,
        athleteBId: 4,
        winnerId: 2,
        loserId: 4,
      }),
    ]);

    const report = await useCase.execute({ competitionId: 1 });
    const [category] = report.categories;

    expect(category.first?.athleteId).toBe(1);
    expect(category.second?.athleteId).toBe(3);
    // So o perdedor da semifinal da Ouro; o perdedor da abertura desceu para a
    // Prata e nao pode contar como terceiro da Ouro.
    expect(category.thirds.map((athlete) => athlete.athleteId)).toEqual([5]);

    expect(category.secondarySeries).not.toBeNull();
    expect(category.secondarySeries?.label).toBe('Série Prata');
    expect(category.secondarySeries?.countsForAcademyRanking).toBe(false);
    expect(category.secondarySeries?.first?.athleteId).toBe(2);
    expect(category.secondarySeries?.second?.athleteId).toBe(4);
  });

  describe('keys mode (fights without category)', () => {
    it('builds one podium per key group, named after the key', async () => {
      const { useCase } = setup(
        [
          ...keysBracketOfFour(5),
          ...keysBracketOfFour(6).map((item) =>
            FightEntity.restore({
              ...item.toJSON(),
              id: (item.id as number) + 10,
            }),
          ),
        ],
        [makeKeyGroup(5, null), makeKeyGroup(6, 'Chave Leve')],
        membersOf(5, [1, 2, 3, 4]),
      );

      const report = await useCase.execute({ competitionId: 1 });

      expect(report.totalCategories).toBe(2);
      expect(report.decidedCategories).toBe(2);
      expect(
        report.categories.map((item) => [item.keyGroupId, item.categoryName]),
      ).toEqual([
        [5, 'Chave 5'],
        [6, 'Chave Leve'],
      ]);

      const [chave] = report.categories;
      expect(chave.categoryId).toBeNull();
      expect(chave.first?.athleteId).toBe(1);
      expect(chave.second?.athleteId).toBe(3);
      expect(chave.thirds.map((athlete) => athlete.athleteId).sort()).toEqual([
        2, 4,
      ]);
      expect(chave.totalAthletes).toBe(4);
    });

    it('uses the manually marked first and second over the fights result', async () => {
      const { useCase } = setup(
        keysBracketOfFour(5),
        [
          makeKeyGroup(5, null).setManualPodium({
            firstAthleteId: 3,
            secondAthleteId: 2,
            championAthleteId: 3,
          }),
        ],
        membersOf(5, [1, 2, 3, 4]),
      );

      const [chave] = (await useCase.execute({ competitionId: 1 })).categories;

      expect(chave.first?.athleteId).toBe(3);
      expect(chave.second?.athleteId).toBe(2);
      // Quem foi marcado a mao sai da lista de terceiros.
      expect(chave.thirds.map((athlete) => athlete.athleteId)).toEqual([4]);
    });

    it('lists a key group marked by hand even without fights, as decided', async () => {
      const { useCase } = setup(
        [],
        [
          makeKeyGroup(5, 'Chave Leve').setManualPodium({
            firstAthleteId: 1,
            secondAthleteId: 2,
            championAthleteId: 1,
          }),
        ],
        membersOf(5, [1, 2]),
      );

      const report = await useCase.execute({
        competitionId: 1,
        onlyDecided: true,
      });

      expect(report.categories).toHaveLength(1);
      expect(report.categories[0]).toMatchObject({
        keyGroupId: 5,
        decided: true,
        first: { athleteId: 1 },
        second: { athleteId: 2 },
        thirds: [],
      });
    });

    it('leaves key groups out when filtering by belt, like the academies report', async () => {
      const { useCase } = setup(keysBracketOfFour(5), [makeKeyGroup(5, null)]);

      await expect(
        useCase.execute({ competitionId: 1, belt: 'BRANCA' }),
      ).resolves.toMatchObject({ totalCategories: 0 });
    });
  });
});
