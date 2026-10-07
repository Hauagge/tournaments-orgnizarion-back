import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac, randomBytes } from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeUser } from '../../../test/factories';
import { InMemoryAuthRepository } from '../../../test/repositories/in-memory';
import { JwtTokenService } from '../../core/auth/infra/services/jwt-token.service';
import { AuthRole } from './auth-role.enum';
import { AuthService } from './auth.service';
import { IUserRepository } from './repository/IUserRepository.repository';
import { IPasswordHasher } from './services/IPasswordHasher.service';
import { PasswordHasherService } from './services/password-hasher.service';

class FakePasswordHasher implements IPasswordHasher {
  hash(plainPassword: string): string {
    return `hashed:${plainPassword}`;
  }

  compare(plainPassword: string, hashedPassword: string): boolean {
    return hashedPassword === this.hash(plainPassword);
  }

  needsRehash(): boolean {
    return false;
  }
}

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: InMemoryAuthRepository;
  let passwordHasher: IPasswordHasher;

  beforeEach(async () => {
    authRepository = new InMemoryAuthRepository();
    passwordHasher = new FakePasswordHasher();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtTokenService,
        {
          provide: IUserRepository,
          useValue: authRepository,
        },
        {
          provide: IPasswordHasher,
          useValue: passwordHasher,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should authenticate and return access token for valid credentials', async () => {
    const password = 'staff123';
    const passwordHash = passwordHasher.hash(password);

    authRepository.setUsers([
      makeUser({
        id: 1,
        username: 'staff',
        passwordHash,
        role: AuthRole.STAFF,
      }),
    ]);

    const result = await service.login({
      username: 'staff',
      password,
    });

    expect(result.user).toEqual({
      id: 1,
      username: 'staff',
      role: AuthRole.STAFF,
      academyId: null,
      competitionIds: [],
    });
    expect(result.accessToken).toBeDefined();
    expect(result.accessToken.split('.')).toHaveLength(3);
  });

  it('should throw UnauthorizedException when user does not exist', async () => {
    authRepository.setUsers([]);

    await expect(
      service.login({ username: 'missing-user', password: 'any-pass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should throw UnauthorizedException for invalid password', async () => {
    authRepository.setUsers([
      makeUser({
        id: 2,
        username: 'desk',
        passwordHash: passwordHasher.hash('correct-password'),
        role: AuthRole.DESK,
      }),
    ]);

    await expect(
      service.login({ username: 'desk', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should rehash a legacy password hash to the new format after a successful login', async () => {
    const realPasswordHasher = new PasswordHasherService();
    const legacyPasswordHash = legacyHash('staff123');

    const migrationAuthRepository = new InMemoryAuthRepository();
    migrationAuthRepository.setUsers([
      makeUser({
        id: 3,
        username: 'legacy-staff',
        passwordHash: legacyPasswordHash,
        role: AuthRole.STAFF,
      }),
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtTokenService,
        {
          provide: IUserRepository,
          useValue: migrationAuthRepository,
        },
        {
          provide: IPasswordHasher,
          useValue: realPasswordHasher,
        },
      ],
    }).compile();

    const migrationService = module.get<AuthService>(AuthService);

    const result = await migrationService.login({
      username: 'legacy-staff',
      password: 'staff123',
    });

    expect(result.accessToken).toBeDefined();

    const updatedUser =
      await migrationAuthRepository.findByUsername('legacy-staff');

    expect(updatedUser?.passwordHash).not.toBe(legacyPasswordHash);
    expect(updatedUser?.passwordHash.startsWith('scrypt:')).toBe(true);
    expect(
      realPasswordHasher.compare('staff123', updatedUser!.passwordHash),
    ).toBe(true);
  });
});

function legacyHash(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHmac('sha256', salt).update(plainPassword).digest('hex');
  return `${salt}:${hash}`;
}
