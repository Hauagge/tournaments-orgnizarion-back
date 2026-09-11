import { UnauthorizedException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  const originalAuthSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET =
      'test-only-auth-secret-do-not-use-in-production-32chars';
  });

  afterEach(() => {
    process.env.AUTH_SECRET = originalAuthSecret;
  });

  it('should throw when AUTH_SECRET is not defined', () => {
    delete process.env.AUTH_SECRET;

    expect(() => new JwtTokenService()).toThrow(
      'AUTH_SECRET deve estar definido com pelo menos 32 caracteres. Configure a variável de ambiente antes de iniciar a aplicação.',
    );
  });

  it('should throw when AUTH_SECRET is shorter than 32 characters', () => {
    process.env.AUTH_SECRET = 'too-short-secret';

    expect(() => new JwtTokenService()).toThrow(
      'AUTH_SECRET deve estar definido com pelo menos 32 caracteres. Configure a variável de ambiente antes de iniciar a aplicação.',
    );
  });

  it('should not throw when AUTH_SECRET has at least 32 characters', () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    expect(() => new JwtTokenService()).not.toThrow();
  });

  it('should sign and verify a round-trip token', () => {
    const service = new JwtTokenService();

    const token = service.sign({
      sub: 1,
      username: 'staff',
      role: AuthRole.STAFF,
      academyId: null,
      competitionIds: [],
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    expect(token.split('.')).toHaveLength(3);

    const decoded = service.verify(token);

    expect(decoded).toEqual({
      sub: 1,
      username: 'staff',
      role: AuthRole.STAFF,
      academyId: null,
      competitionIds: [],
      exp: expect.any(Number),
    });
  });

  it('should throw UnauthorizedException for a tampered signature', () => {
    const service = new JwtTokenService();

    const token = service.sign({
      sub: 1,
      username: 'staff',
      role: AuthRole.STAFF,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    const tamperedToken = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(() => service.verify(tamperedToken)).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException for a malformed token', () => {
    const service = new JwtTokenService();

    expect(() => service.verify('not-a-valid-token')).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException for an expired token', () => {
    const service = new JwtTokenService();

    const token = service.sign({
      sub: 1,
      username: 'staff',
      role: AuthRole.STAFF,
      exp: Math.floor(Date.now() / 1000) - 10,
    });

    expect(() => service.verify(token)).toThrow('Token expirado');
  });

  it('should reject a token signed with a different secret', () => {
    const service = new JwtTokenService();

    const token = service.sign({
      sub: 1,
      username: 'staff',
      role: AuthRole.STAFF,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    process.env.AUTH_SECRET = 'a-completely-different-secret-32-chars!';
    const serviceWithDifferentSecret = new JwtTokenService();

    expect(() => serviceWithDifferentSecret.verify(token)).toThrow(
      UnauthorizedException,
    );
  });
});
