import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeUser } from '../../../test/factories';
import { InMemoryAuthRepository } from '../../../test/repositories/in-memory';
import { AuthRole } from './auth-role.enum';
import { AuthService } from './auth.service';
import { IUserRepository } from './repository/IUserRepository.repository';
import { IPasswordHasher } from './services/IPasswordHasher.service';

class FakePasswordHasher implements IPasswordHasher {
  hash(plainPassword: string): string {
    return `hashed:${plainPassword}`;
  }

  compare(plainPassword: string, hashedPassword: string): boolean {
    return hashedPassword === this.hash(plainPassword);
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
});
