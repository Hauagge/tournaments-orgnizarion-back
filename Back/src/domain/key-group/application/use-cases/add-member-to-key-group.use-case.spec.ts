import { beforeEach, describe, expect, it } from 'vitest';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeAthlete, makeCompetition } from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
  InMemoryKeyGroupRepository,
} from '../../../../../test/repositories/in-memory';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { KeyGroupMember } from '../../domain/entities/key-group-member.entity';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { AddMemberToKeyGroupUseCase } from './add-member-to-key-group.use-case';

function makeGroup(input: {
  id: number;
  competitionId?: number;
  status?: KeyGroupStatus;
}) {
  return KeyGroup.restore({
    id: input.id,
    competitionId: input.competitionId ?? 1,
    categoryId: 10,
    name: 'Chave A',
    status: input.status ?? KeyGroupStatus.READY,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
}

function makeMember(input: {
  id: number;
  keyGroupId: number;
  athleteId: number;
}) {
  return KeyGroupMember.restore({
    id: input.id,
    keyGroupId: input.keyGroupId,
    athleteId: input.athleteId,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
}

describe('AddMemberToKeyGroupUseCase', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let keyGroupRepository: InMemoryKeyGroupRepository;
  let athleteRepository: InMemoryAthleteRepository;
  let fightRepository: InMemoryFightRepository;
  let useCase: AddMemberToKeyGroupUseCase;

  function setup(mode: CompetitionMode) {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1, mode }),
    ]);
    keyGroupRepository = new InMemoryKeyGroupRepository(
      [makeGroup({ id: 20, competitionId: 1 })],
      [
        makeMember({ id: 1, keyGroupId: 20, athleteId: 101 }),
        makeMember({ id: 2, keyGroupId: 20, athleteId: 102 }),
        makeMember({ id: 3, keyGroupId: 20, athleteId: 103 }),
        makeMember({ id: 4, keyGroupId: 20, athleteId: 104 }),
      ],
    );
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 105, competitionId: 1 }),
    ]);
    fightRepository = new InMemoryFightRepository([]);
    useCase = new AddMemberToKeyGroupUseCase(
      keyGroupRepository,
      athleteRepository,
      fightRepository,
      competitionRepository,
    );
  }

  it('throws when the key group already has 4 athletes in a KEYS competition', async () => {
    setup(CompetitionMode.KEYS);

    await expect(() =>
      useCase.execute({ keyGroupId: 20, athleteId: 105 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows a 5th athlete when the competition is CBJJ', async () => {
    setup(CompetitionMode.CBJJ);

    const member = await useCase.execute({ keyGroupId: 20, athleteId: 105 });

    expect(member.athleteId).toBe(105);
    const members = await keyGroupRepository.listMembersByKeyGroupId(20);
    expect(members).toHaveLength(5);
  });
});
