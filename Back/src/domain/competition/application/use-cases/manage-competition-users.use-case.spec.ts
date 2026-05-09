import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  makeCompetition,
  makeUser,
  makeUserCompetitionLink,
} from '../../../../../test/factories';
import { InMemoryAuthRepository } from '../../../../../test/repositories/in-memory';
import { InMemoryCompetitionRepository } from '../../../../../test/repositories/in-memory/in-memory-competition.repository';
import { AuthRole } from '../../../auth/auth-role.enum';
import { CompetitionAccessRole } from '../../../auth/competition-access-role.enum';
import { NotFoundError } from '../../../../shared/errors/not-found.error';
import { CompetitionAccessService } from '../services/competition-access.service';
import { AddUserToCompetitionUseCase } from './add-user-to-competition.use-case';
import { CreateCompetitionUseCase } from './create-competition.use-case';
import { RemoveUserFromCompetitionUseCase } from './remove-user-from-competition.use-case';

describe('ManageCompetitionUsersUseCases', () => {
  let authRepository: InMemoryAuthRepository;
  let competitionRepository: InMemoryCompetitionRepository;
  let accessService: CompetitionAccessService;

  beforeEach(() => {
    authRepository = new InMemoryAuthRepository();
    competitionRepository = new InMemoryCompetitionRepository();
    accessService = new CompetitionAccessService(
      competitionRepository,
      authRepository,
    );
  });

  it('should link creator as OWNER when creating competition', async () => {
    const useCase = new CreateCompetitionUseCase(
      competitionRepository,
      authRepository,
    );

    const competition = await useCase.execute({
      currentUserId: 10,
      name: 'Summer Cup',
      mode: 'KEYS' as never,
      fightDurationSeconds: 300,
      weighInMarginGrams: 500,
      ageSplitYears: 2,
    });

    expect(
      await authRepository.findByUserIdAndCompetitionId({
        userId: 10,
        competitionId: competition.id as number,
      }),
    ).toEqual({
      userId: 10,
      competitionId: competition.id,
      role: CompetitionAccessRole.OWNER,
    });
  });

  it('should allow owner to add another user as MEMBER', async () => {
    authRepository.setUsers([
      makeUser({
        id: 1,
        role: AuthRole.STAFF,
        competitionLinks: [
          makeUserCompetitionLink({
            userId: 1,
            competitionId: 5,
            role: CompetitionAccessRole.OWNER,
          }),
        ],
      }),
      makeUser({
        id: 2,
        role: AuthRole.DESK,
      }),
    ]);
    competitionRepository.setCompetitions([makeCompetition({ id: 5 })]);

    const useCase = new AddUserToCompetitionUseCase(
      accessService,
      authRepository,
      authRepository,
    );

    await useCase.execute({
      currentUserId: 1,
      currentUserRole: AuthRole.STAFF,
      competitionId: 5,
      targetUserId: 2,
    });

    expect(
      await authRepository.findByUserIdAndCompetitionId({
        userId: 2,
        competitionId: 5,
      }),
    ).toEqual({
      userId: 2,
      competitionId: 5,
      role: CompetitionAccessRole.MEMBER,
    });
  });

  it('should block non-owner from adding users', async () => {
    authRepository.setUsers([
      makeUser({
        id: 1,
        role: AuthRole.STAFF,
        competitionLinks: [
          makeUserCompetitionLink({
            userId: 1,
            competitionId: 5,
            role: CompetitionAccessRole.MEMBER,
          }),
        ],
      }),
      makeUser({ id: 2, role: AuthRole.DESK }),
    ]);
    competitionRepository.setCompetitions([makeCompetition({ id: 5 })]);

    const useCase = new AddUserToCompetitionUseCase(
      accessService,
      authRepository,
      authRepository,
    );

    await expect(
      useCase.execute({
        currentUserId: 1,
        currentUserRole: AuthRole.STAFF,
        competitionId: 5,
        targetUserId: 2,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should block removing the owner', async () => {
    authRepository.setUsers([
      makeUser({
        id: 1,
        role: AuthRole.STAFF,
        competitionLinks: [
          makeUserCompetitionLink({
            userId: 1,
            competitionId: 5,
            role: CompetitionAccessRole.OWNER,
          }),
        ],
      }),
    ]);
    competitionRepository.setCompetitions([makeCompetition({ id: 5 })]);

    const useCase = new RemoveUserFromCompetitionUseCase(
      accessService,
      authRepository,
    );

    await expect(
      useCase.execute({
        currentUserId: 1,
        currentUserRole: AuthRole.STAFF,
        competitionId: 5,
        targetUserId: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should fail when target user does not exist', async () => {
    authRepository.setUsers([
      makeUser({
        id: 1,
        role: AuthRole.STAFF,
        competitionLinks: [
          makeUserCompetitionLink({
            userId: 1,
            competitionId: 5,
            role: CompetitionAccessRole.OWNER,
          }),
        ],
      }),
    ]);
    competitionRepository.setCompetitions([makeCompetition({ id: 5 })]);

    const useCase = new AddUserToCompetitionUseCase(
      accessService,
      authRepository,
      authRepository,
    );

    await expect(
      useCase.execute({
        currentUserId: 1,
        currentUserRole: AuthRole.STAFF,
        competitionId: 5,
        targetUserId: 99,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
