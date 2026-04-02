import { beforeEach, describe, expect, it } from 'vitest';
import {
  makeAthlete,
  makeCompetition,
  makeTeam,
} from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCompetitionRepository,
  InMemoryAcademyRepository,
} from '../../../../../test/repositories/in-memory';
import { ValidationError } from '@/shared/errors/validation.error';
import { LinkAthleteToAcademyUseCase } from './add-athlete-to-academy.use-case';
import { CreateAcademyUseCase } from './create-academy.use-case';
import { ListAcademiesByCompetitionUseCase } from './list-academies-by-competition.use-case';
import { UnlinkAthleteFromAcademyUseCase } from './remove-athlete-from-academy.use-case';
import { UpdateAcademyUseCase } from './update-academy.use-case';

describe('Academy use cases', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let teamRepository: InMemoryAcademyRepository;
  let athleteRepository: InMemoryAthleteRepository;

  beforeEach(() => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 10 }),
      makeCompetition({ id: 20 }),
    ]);
    teamRepository = new InMemoryAcademyRepository([
      makeTeam({ id: 1, competitionId: 10, name: 'Alpha Academy' }),
      makeTeam({ id: 2, competitionId: 10, name: 'Bravo Academy' }),
    ]);
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 5, competitionId: 10, academyId: null }),
      makeAthlete({ id: 6, competitionId: 20, academyId: null }),
      makeAthlete({ id: 7, competitionId: 10, academyId: 1 }),
    ]);
  });

  it('should create a academy for a competition', async () => {
    const useCase = new CreateAcademyUseCase(
      competitionRepository,
      teamRepository,
    );

    const academy = await useCase.execute({
      competitionId: 10,
      name: '  New Academy  ',
    });

    expect(academy.toJSON()).toEqual(
      expect.objectContaining({
        competitionId: 10,
        name: 'New Academy',
      }),
    );
  });

  it('should update a academy name', async () => {
    const useCase = new UpdateAcademyUseCase(teamRepository);

    const academy = await useCase.execute({
      id: 1,
      name: '  Renamed Academy ',
    });

    expect(academy.toJSON()).toEqual(
      expect.objectContaining({
        id: 1,
        name: 'Renamed Academy',
      }),
    );
  });

  it('should list academies by competition sorted by name', async () => {
    const useCase = new ListAcademiesByCompetitionUseCase(
      competitionRepository,
      teamRepository,
    );

    const academies = await useCase.execute({
      competitionId: 10,
    });

    expect(academies.map((academy) => academy.name)).toEqual([
      'Alpha Academy',
      'Bravo Academy',
    ]);
  });

  it('should add athlete to a academy from the same competition', async () => {
    const useCase = new LinkAthleteToAcademyUseCase(
      teamRepository,
      athleteRepository,
    );

    const athlete = await useCase.execute({
      academyId: 1,
      athleteId: 5,
    });

    expect(athlete.academyId).toBe(1);
  });

  it('should not add athlete to a academy from another competition', async () => {
    const useCase = new LinkAthleteToAcademyUseCase(
      teamRepository,
      athleteRepository,
    );

    await expect(
      useCase.execute({
        academyId: 1,
        athleteId: 6,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('should remove athlete from a academy', async () => {
    const useCase = new UnlinkAthleteFromAcademyUseCase(
      teamRepository,
      athleteRepository,
    );

    const athlete = await useCase.execute({
      academyId: 1,
      athleteId: 7,
    });

    expect(athlete.academyId).toBeNull();
  });
});
