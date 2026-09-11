import { createHmac, randomBytes } from 'crypto';
import { describe, expect, it } from 'vitest';
import { PasswordHasherService } from './password-hasher.service';

function legacyHash(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHmac('sha256', salt).update(plainPassword).digest('hex');
  return `${salt}:${hash}`;
}

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService();

  it('should hash a password using the new scrypt format', () => {
    const hashedPassword = service.hash('secret123');

    expect(hashedPassword).not.toBe('secret123');
    expect(hashedPassword.startsWith('scrypt:')).toBe(true);
    expect(hashedPassword.split(':')).toHaveLength(3);
  });

  it('should compare a valid password successfully', () => {
    const hashedPassword = service.hash('secret123');

    expect(service.compare('secret123', hashedPassword)).toBe(true);
  });

  it('should reject an invalid password', () => {
    const hashedPassword = service.hash('secret123');

    expect(service.compare('wrong-password', hashedPassword)).toBe(false);
  });

  it('should report that a hash in the new format does not need a rehash', () => {
    const hashedPassword = service.hash('secret123');

    expect(service.needsRehash(hashedPassword)).toBe(false);
  });

  it('should still validate a password against a legacy HMAC-formatted hash', () => {
    const legacyHashedPassword = legacyHash('secret123');

    expect(service.compare('secret123', legacyHashedPassword)).toBe(true);
    expect(service.compare('wrong-password', legacyHashedPassword)).toBe(
      false,
    );
  });

  it('should report that a legacy-formatted hash needs a rehash', () => {
    const legacyHashedPassword = legacyHash('secret123');

    expect(service.needsRehash(legacyHashedPassword)).toBe(true);
  });
});
