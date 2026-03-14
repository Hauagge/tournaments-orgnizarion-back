import { describe, expect, it } from 'vitest';
import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService();

  it('should hash a password in a non-plain format', () => {
    const hashedPassword = service.hash('secret123');

    expect(hashedPassword).not.toBe('secret123');
    expect(hashedPassword.split(':')).toHaveLength(2);
  });

  it('should compare a valid password successfully', () => {
    const hashedPassword = service.hash('secret123');

    expect(service.compare('secret123', hashedPassword)).toBe(true);
  });

  it('should reject an invalid password', () => {
    const hashedPassword = service.hash('secret123');

    expect(service.compare('wrong-password', hashedPassword)).toBe(false);
  });
});
