import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeAthlete } from '../../../test/factories';
import { InMemoryAthleteRepository } from '../../../test/repositories/in-memory';
import { IAthleteRepository } from './repository/IAthleteRepository.repository';
import { AthleteService } from './athlete.service';

describe('AthleteService', () => {
  let service: AthleteService;
  let athleteRepository: InMemoryAthleteRepository;

  beforeEach(async () => {
    athleteRepository = new InMemoryAthleteRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AthleteService,
        {
          provide: IAthleteRepository,
          useValue: athleteRepository,
        },
      ],
    }).compile();

    service = module.get<AthleteService>(AthleteService);
  });

  it('should create athlete with generated subscription number', async () => {
    const result = await service.create({
      name: 'Ana',
      age: 13,
      weight: 48,
      beltColor: 'white',
      tutor: 'Maria',
    });

    expect(result.id).toBe(1);
    expect(result.name).toBe('Ana');
    expect(result.subscriptionNumber).toContain(`${new Date().getFullYear()}-`);
  });

  it('should confirm weigh-in and set eligibility', async () => {
    athleteRepository.setAthletes([makeAthlete({ id: 10, eligible: null })]);

    const updated = await service.confirmWeighIn(10, true);

    expect(updated?.weighInConfirmed).toBe(true);
    expect(updated?.eligible).toBe(true);
  });
});
