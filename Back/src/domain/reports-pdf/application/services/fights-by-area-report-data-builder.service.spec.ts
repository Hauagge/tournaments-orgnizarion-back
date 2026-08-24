import { beforeEach, describe, expect, it } from 'vitest';
import { Area } from '@/domain/area/domain/entities/area.entity';
import { IAreaRepository } from '@/domain/area/repository/IAreaRepository.repository';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import {
  makeAthlete,
  makeCategory,
  makeCompetition,
} from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCategoryRepository,
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
  InMemoryKeyGroupRepository,
} from '../../../../../test/repositories/in-memory';
import { FightsByAreaReportDataBuilderService } from './fights-by-area-report-data-builder.service';

class InMemoryAreaRepository implements IAreaRepository {
  constructor(private readonly areas: Area[] = []) {}

  async createMany(areas: Area[]): Promise<Area[]> {
    return areas;
  }

  async findById(id: number): Promise<Area | null> {
    return this.areas.find((area) => area.id === id) ?? null;
  }

  async listByCompetitionId(competitionId: number): Promise<Area[]> {
    return this.areas.filter((area) => area.competitionId === competitionId);
  }
}

describe('FightsByAreaReportDataBuilderService', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let areaRepository: InMemoryAreaRepository;
  let fightRepository: InMemoryFightRepository;
  let athleteRepository: InMemoryAthleteRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let keyGroupRepository: InMemoryKeyGroupRepository;

  beforeEach(() => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1, name: 'Copa Central' }),
    ]);
    areaRepository = new InMemoryAreaRepository([]);
    fightRepository = new InMemoryFightRepository([]);
    athleteRepository = new InMemoryAthleteRepository([]);
    categoryRepository = new InMemoryCategoryRepository([]);
    keyGroupRepository = new InMemoryKeyGroupRepository();
  });

  it('should group fights by area, sort areas and fights, include unassigned fights and apply fallbacks', async () => {
    areaRepository = new InMemoryAreaRepository([
      makeArea({ id: 2, competitionId: 1, name: 'Área 2', order: 2 }),
      makeArea({ id: 1, competitionId: 1, name: 'Área 1', order: 1 }),
    ]);
    fightRepository = new InMemoryFightRepository([
      makeFight({
        id: 10,
        competitionId: 1,
        categoryId: 100,
        areaId: 1,
        athleteAId: 1,
        athleteBId: 2,
        orderIndex: 2,
      }),
      makeFight({
        id: 11,
        competitionId: 1,
        categoryId: 100,
        areaId: 1,
        athleteAId: 3,
        athleteBId: 4,
        orderIndex: 1,
      }),
      makeFight({
        id: 12,
        competitionId: 1,
        categoryId: null,
        areaId: null,
        athleteAId: 5,
        athleteBId: 6,
        orderIndex: 3,
      }),
      makeFight({
        id: 999,
        competitionId: 2,
        categoryId: 999,
        areaId: 2,
        athleteAId: 1,
        athleteBId: 2,
        orderIndex: 1,
      }),
    ]);
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({
        id: 1,
        competitionId: 1,
        fullName: 'João Silva',
        academyId: 10,
        belt: 'blue',
      }),
      makeAthlete({
        id: 2,
        competitionId: 1,
        fullName: 'Pedro Souza',
        academyId: 20,
        belt: 'blue',
      }),
      makeAthlete({
        id: 3,
        competitionId: 1,
        fullName: 'Carlos Lima',
        academyId: null,
        belt: 'blue',
      }),
      makeAthlete({
        id: 4,
        competitionId: 1,
        fullName: 'Marcos Alves',
        academyId: null,
        belt: 'blue',
      }),
      makeAthlete({
        id: 5,
        competitionId: 1,
        fullName: 'Ana Costa',
        academyId: null,
        belt: 'white',
      }),
    ]);
    categoryRepository = new InMemoryCategoryRepository([
      makeCategory({
        id: 100,
        competitionId: 1,
        name: 'Adulto Azul Leve',
        belt: 'blue',
        weightMinGrams: 65000,
        weightMaxGrams: 70000,
      }),
    ]);
    keyGroupRepository = new InMemoryKeyGroupRepository();
    keyGroupRepository.setReportViews([
      {
        id: 500,
        competitionId: 1,
        categoryId: 100,
        categoryName: 'Adulto Azul Leve',
        name: 'Chave A',
        status: 'READY',
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        members: [
          {
            id: 1,
            fullName: 'João Silva',
            birthDate: new Date(),
            belt: 'blue',
            academyName: 'Team A',
          },
          {
            id: 2,
            fullName: 'Pedro Souza',
            birthDate: new Date(),
            belt: 'blue',
            academyName: 'Team B',
          },
          {
            id: 3,
            fullName: 'Carlos Lima',
            birthDate: new Date(),
            belt: 'blue',
            academyName: null,
          },
          {
            id: 4,
            fullName: 'Marcos Alves',
            birthDate: new Date(),
            belt: 'blue',
            academyName: null,
          },
        ],
        fights: [
          {
            id: 11,
            keyGroupId: 500,
            areaId: 1,
            areaName: 'Área 1',
            athleteAId: 3,
            athleteAName: 'Carlos Lima',
            academyAName: null,
            athleteBId: 4,
            athleteBName: 'Marcos Alves',
            academyBName: null,
            status: FightStatus.WAITING,
            winnerAthleteId: null,
            winType: null,
            orderIndex: 1,
          },
          {
            id: 10,
            keyGroupId: 500,
            areaId: 1,
            areaName: 'Área 1',
            athleteAId: 1,
            athleteAName: 'João Silva',
            academyAName: 'Team A',
            athleteBId: 2,
            athleteBName: 'Pedro Souza',
            academyBName: 'Team B',
            status: FightStatus.WAITING,
            winnerAthleteId: null,
            winType: null,
            orderIndex: 2,
          },
        ],
      },
    ]);

    const service = new FightsByAreaReportDataBuilderService(
      competitionRepository,
      areaRepository,
      fightRepository,
      athleteRepository,
      categoryRepository,
      keyGroupRepository,
    );

    const result = await service.build(1);

    expect(result.competitionName).toBe('Copa Central');
    expect(result.sections.map((section) => section.areaName)).toEqual([
      'Área 1',
      'Área 2',
    ]);
    expect(result.sections[0].fights[0]).toMatchObject({
      categoryName: 'Adulto Azul Leve',
      athleteAName: 'Carlos Lima',
      athleteBName: 'Marcos Alves',
    });
    expect(result.unassignedSection?.areaName).toBe('Lutas sem área definida');
    expect(result.unassignedSection?.fights[0]).toMatchObject({
      categoryName: 'Categoria não informada',
      athleteAName: 'Ana Costa',
      athleteBName: 'Atleta 6',
    });
    expect(
      result.sections
        .flatMap((section) => section.fights)
        .some((fight) => fight.categoryName === 'Outra competição'),
    ).toBe(false);
  });

  it('should throw NotFoundError when competition does not exist', async () => {
    competitionRepository = new InMemoryCompetitionRepository([]);

    const service = new FightsByAreaReportDataBuilderService(
      competitionRepository,
      areaRepository,
      fightRepository,
      athleteRepository,
      categoryRepository,
      keyGroupRepository,
    );

    await expect(service.build(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw ValidationError when competition has no fights', async () => {
    const service = new FightsByAreaReportDataBuilderService(
      competitionRepository,
      areaRepository,
      fightRepository,
      athleteRepository,
      categoryRepository,
      keyGroupRepository,
    );

    await expect(service.build(1)).rejects.toBeInstanceOf(ValidationError);
  });
});

function makeArea(input: {
  id: number;
  competitionId: number;
  name: string;
  order: number;
}) {
  return Area.restore({
    ...input,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
}

function makeFight(input: {
  id: number;
  competitionId: number;
  categoryId: number | null;
  areaId: number | null;
  athleteAId: number;
  athleteBId: number;
  orderIndex: number;
}) {
  return FightEntity.restore({
    id: input.id,
    competitionId: input.competitionId,
    categoryId: input.categoryId,
    keyGroupId: null,
    areaId: input.areaId,
    areaName: input.areaId === null ? null : `Área ${input.areaId}`,
    status: FightStatus.WAITING,
    athleteAId: input.athleteAId,
    athleteBId: input.athleteBId,
    winnerAthleteId: null,
    winType: null,
    startedAt: null,
    finishedAt: null,
    orderIndex: input.orderIndex,
  });
}
