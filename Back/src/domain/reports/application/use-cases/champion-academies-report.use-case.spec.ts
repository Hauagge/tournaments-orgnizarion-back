import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { makeAcademy } from '../../../../../test/factories/academy.factory';
import { makeAthlete } from '../../../../../test/factories/athlete.factory';
import { makeCategory } from '../../../../../test/factories/category.factory';
import { makeCompetition } from '../../../../../test/factories/competition.factory';
import { KeyGroup } from '@/domain/key-group/domain/entities/key-group.entity';
import { KeyGroupStatus } from '@/domain/key-group/domain/value-objects/key-group-status.enum';
import {
  InMemoryAcademyRepository,
  InMemoryAthleteRepository,
  InMemoryCategoryRepository,
  InMemoryCompetitionRepository,
  InMemoryKeyGroupRepository,
} from '../../../../../test/repositories/in-memory';
import { ChampionAcademiesReportUseCase } from './champion-academies-report.use-case';

describe('ChampionAcademiesReportUseCase', () => {
  let useCase: ChampionAcademiesReportUseCase;

  beforeEach(() => {
    useCase = new ChampionAcademiesReportUseCase(
      new InMemoryCompetitionRepository([makeCompetition({ id: 1 })]),
      new InMemoryCategoryRepository([
        makeCategory({ id: 1, name: 'Adulto Azul Leve', belt: 'blue', championAthleteId: 10 }),
        makeCategory({ id: 2, name: 'Adulto Azul Medio', belt: 'blue', championAthleteId: 20 }),
        makeCategory({
          id: 3,
          name: 'Infantil Branco Leve',
          belt: 'white',
          ageMin: 10,
          ageMax: 11,
          weightMinGrams: null,
          weightMaxGrams: 40000,
          championAthleteId: 30,
        }),
        makeCategory({ id: 4, name: 'Adulto Preta Leve', belt: 'black' }),
      ]),
      new InMemoryAthleteRepository([
        makeAthlete({ id: 10, fullName: 'Bruno', academyId: 1 }),
        makeAthlete({ id: 20, fullName: 'Ana', academyId: 2 }),
        makeAthlete({ id: 30, fullName: 'Carla', academyId: 1 }),
      ]),
      new InMemoryAcademyRepository([
        makeAcademy({ id: 1, competitionId: 1, name: 'Gracie Barra' }),
        makeAcademy({ id: 2, competitionId: 1, name: 'Alliance' }),
      ]),
      new InMemoryKeyGroupRepository(),
    );
  });

  it('ranks academies by champion count', async () => {
    const report = await useCase.execute({ competitionId: 1 });

    expect(report.totalChampionAthletes).toBe(3);
    expect(report.academies).toHaveLength(2);
    expect(report.academies[0]).toEqual(
      expect.objectContaining({
        position: 1,
        academyId: 1,
        academyName: 'Gracie Barra',
        totalChampions: 2,
      }),
    );
    expect(report.academies[1]).toEqual(
      expect.objectContaining({ position: 2, academyName: 'Alliance', totalChampions: 1 }),
    );
  });

  it('describes each champion with category, belt, age and weight divisions', async () => {
    const report = await useCase.execute({ competitionId: 1 });

    const champions = report.academies[0].champions;
    expect(champions.map((champion) => champion.athleteName)).toEqual([
      'Bruno',
      'Carla',
    ]);
    expect(champions[1]).toEqual({
      athleteId: 30,
      athleteName: 'Carla',
      categoryId: 3,
      categoryName: 'Infantil Branco Leve',
      keyGroupId: null,
      keyGroupName: null,
      belt: 'white',
      ageDivision: '10-11 anos',
      weightDivision: 'ate 40,0 kg',
    });
  });

  it('ignores categories without a champion', async () => {
    const report = await useCase.execute({ competitionId: 1 });

    const categoryIds = report.academies.flatMap((academy) =>
      academy.champions.map((champion) => champion.categoryId),
    );
    expect(categoryIds).not.toContain(4);
  });

  it('filters by belt', async () => {
    const report = await useCase.execute({ competitionId: 1, belt: 'BLUE' });

    expect(report.totalChampionAthletes).toBe(2);
    expect(
      report.academies.flatMap((academy) =>
        academy.champions.map((champion) => champion.categoryId),
      ),
    ).toEqual(expect.arrayContaining([1, 2]));
  });

  it('filters by category and age division', async () => {
    const byCategory = await useCase.execute({ competitionId: 1, categoryId: 3 });
    expect(byCategory.totalChampionAthletes).toBe(1);

    const byAgeDivision = await useCase.execute({
      competitionId: 1,
      ageDivision: '10-11 anos',
    });
    expect(byAgeDivision.totalChampionAthletes).toBe(1);
  });

  it('returns an empty report when there are no champions yet', async () => {
    const emptyUseCase = new ChampionAcademiesReportUseCase(
      new InMemoryCompetitionRepository([makeCompetition({ id: 1 })]),
      new InMemoryCategoryRepository([makeCategory({ id: 1 })]),
      new InMemoryAthleteRepository([]),
      new InMemoryAcademyRepository([]),
      new InMemoryKeyGroupRepository(),
    );

    const report = await emptyUseCase.execute({ competitionId: 1 });

    expect(report).toEqual({
      competitionId: 1,
      totalChampionAthletes: 0,
      academies: [],
    });
  });

  it('ranks key group champions when the competition has no categories', async () => {
    const useCase = new ChampionAcademiesReportUseCase(
      new InMemoryCompetitionRepository([makeCompetition({ id: 1 })]),
      new InMemoryCategoryRepository([]),
      new InMemoryAthleteRepository([
        makeAthlete({ id: 10, fullName: 'Bruno', academyId: 1 }),
        makeAthlete({ id: 20, fullName: 'Ana', academyId: 2 }),
      ]),
      new InMemoryAcademyRepository([
        makeAcademy({ id: 1, competitionId: 1, name: 'Gracie Barra' }),
        makeAcademy({ id: 2, competitionId: 1, name: 'Alliance' }),
      ]),
      new InMemoryKeyGroupRepository([
        KeyGroup.restore({
          id: 1,
          competitionId: 1,
          categoryId: null,
          name: 'Chave Azul',
          status: KeyGroupStatus.READY,
          createdAt: new Date('2026-01-10T00:00:00.000Z'),
          championAthleteId: 10,
        }),
        KeyGroup.restore({
          id: 2,
          competitionId: 1,
          categoryId: null,
          name: null,
          status: KeyGroupStatus.READY,
          createdAt: new Date('2026-01-10T00:00:00.000Z'),
          championAthleteId: 20,
        }),
        KeyGroup.restore({
          id: 3,
          competitionId: 1,
          categoryId: null,
          name: 'Chave sem campeao',
          status: KeyGroupStatus.READY,
          createdAt: new Date('2026-01-10T00:00:00.000Z'),
          championAthleteId: null,
        }),
      ]),
    );

    const report = await useCase.execute({ competitionId: 1 });

    expect(report.totalChampionAthletes).toBe(2);
    expect(report.academies.map((academy) => academy.academyName)).toEqual([
      'Alliance',
      'Gracie Barra',
    ]);
    expect(report.academies[1].champions[0]).toEqual(
      expect.objectContaining({
        athleteId: 10,
        categoryId: null,
        categoryName: null,
        keyGroupId: 1,
        keyGroupName: 'Chave Azul',
      }),
    );
    expect(report.academies[0].champions[0].keyGroupName).toBe('Chave 2');
  });

  it('does not count the same champion twice when the key group has a category', async () => {
    const useCase = new ChampionAcademiesReportUseCase(
      new InMemoryCompetitionRepository([makeCompetition({ id: 1 })]),
      new InMemoryCategoryRepository([
        makeCategory({ id: 4, competitionId: 1, championAthleteId: 10 }),
      ]),
      new InMemoryAthleteRepository([
        makeAthlete({ id: 10, fullName: 'Bruno', academyId: 1 }),
      ]),
      new InMemoryAcademyRepository([
        makeAcademy({ id: 1, competitionId: 1, name: 'Gracie Barra' }),
      ]),
      new InMemoryKeyGroupRepository([
        KeyGroup.restore({
          id: 1,
          competitionId: 1,
          categoryId: 4,
          name: 'Chave A',
          status: KeyGroupStatus.READY,
          createdAt: new Date('2026-01-10T00:00:00.000Z'),
          championAthleteId: 10,
        }),
      ]),
    );

    const report = await useCase.execute({ competitionId: 1 });

    expect(report.totalChampionAthletes).toBe(1);
    expect(report.academies[0].champions[0]).toEqual(
      expect.objectContaining({ keyGroupId: 1, categoryId: 4 }),
    );
  });

  it('throws NotFoundError when the competition does not exist', async () => {
    await expect(useCase.execute({ competitionId: 999 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
