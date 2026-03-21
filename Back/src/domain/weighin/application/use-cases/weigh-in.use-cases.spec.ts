import { beforeEach, describe, expect, it } from 'vitest';
import { makeAthlete, makeCompetition } from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCompetitionRepository,
} from '../../../../../test/repositories/in-memory';
import { InMemoryWeighInRepository } from '../../../../../test/repositories/in-memory/in-memory-weigh-in.repository';
import { ConfirmWeighInUseCase } from './confirm-weigh-in.use-case';
import { GetWeighInStatusUseCase } from './get-weigh-in-status.use-case';
import { ResetWeighInUseCase } from './reset-weigh-in.use-case';
import { SearchWeighInByAthleteNameUseCase } from './search-weigh-in-by-athlete-name.use-case';
import { WeighInStatus } from '../../domain/value-objects/weigh-in-status.enum';

describe('WeighIn use cases', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let athleteRepository: InMemoryAthleteRepository;
  let weighInRepository: InMemoryWeighInRepository;

  beforeEach(() => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({
        id: 10,
        weighInMarginGrams: 500,
      }),
    ]);
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({
        id: 1,
        competitionId: 10,
        fullName: 'Carlos Silva',
        declaredWeightGrams: 70000,
      }),
      makeAthlete({
        id: 2,
        competitionId: 10,
        fullName: 'Bruno Souza',
        declaredWeightGrams: 76000,
      }),
    ]);
    weighInRepository = new InMemoryWeighInRepository();
  });

  it('should disqualify athlete when measured weight exceeds declared weight plus margin', async () => {
    const useCase = new ConfirmWeighInUseCase(
      competitionRepository,
      athleteRepository,
      weighInRepository,
    );

    const weighIn = await useCase.execute({
      competitionId: 10,
      athleteId: 1,
      measuredWeightGrams: 70501,
      performedBy: 'referee-1',
    });

    expect(weighIn.toJSON()).toMatchObject({
      competitionId: 10,
      athleteId: 1,
      measuredWeightGrams: 70501,
      status: WeighInStatus.REJECTED,
      performedBy: 'referee-1',
    });
    expect(weighIn.performedAt).toBeInstanceOf(Date);
  });

  it('should reset weigh-in back to pending and clear measured data', async () => {
    const confirmUseCase = new ConfirmWeighInUseCase(
      competitionRepository,
      athleteRepository,
      weighInRepository,
    );
    const resetUseCase = new ResetWeighInUseCase(
      competitionRepository,
      athleteRepository,
      weighInRepository,
    );

    await confirmUseCase.execute({
      competitionId: 10,
      athleteId: 1,
      measuredWeightGrams: 70000,
      performedBy: 'referee-1',
    });

    const weighIn = await resetUseCase.execute({
      competitionId: 10,
      athleteId: 1,
    });

    expect(weighIn.toJSON()).toMatchObject({
      competitionId: 10,
      athleteId: 1,
      measuredWeightGrams: null,
      status: WeighInStatus.PENDING,
      performedAt: null,
      performedBy: null,
    });
  });

  it('should return pending status for athletes without weigh-in when searching by athlete name', async () => {
    const confirmUseCase = new ConfirmWeighInUseCase(
      competitionRepository,
      athleteRepository,
      weighInRepository,
    );
    const searchUseCase = new SearchWeighInByAthleteNameUseCase(
      competitionRepository,
      athleteRepository,
      weighInRepository,
    );
    const statusUseCase = new GetWeighInStatusUseCase(
      competitionRepository,
      athleteRepository,
      weighInRepository,
    );

    await confirmUseCase.execute({
      competitionId: 10,
      athleteId: 2,
      measuredWeightGrams: 76000,
      performedBy: 'mesa-1',
    });

    const [pendingAthlete] = await searchUseCase.execute({
      competitionId: 10,
      query: 'Carlos',
    });
    const confirmedAthlete = await statusUseCase.execute({
      competitionId: 10,
      athleteId: 2,
    });

    expect(pendingAthlete).toMatchObject({
      athleteId: 1,
      athleteName: 'Carlos Silva',
      status: WeighInStatus.PENDING,
      measuredWeightGrams: null,
      performedAt: null,
      performedBy: null,
    });
    expect(confirmedAthlete).toMatchObject({
      athleteId: 2,
      athleteName: 'Bruno Souza',
      status: WeighInStatus.APPROVED,
      measuredWeightGrams: 76000,
      performedBy: 'mesa-1',
    });
  });
});
