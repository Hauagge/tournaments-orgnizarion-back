import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { IPasswordHasher } from './IPasswordHasher.service';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEY_LENGTH = 64;

@Injectable()
export class PasswordHasherService implements IPasswordHasher {
  hash(plainPassword: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(plainPassword, salt, SCRYPT_KEY_LENGTH).toString(
      'hex',
    );
    return `${SCRYPT_PREFIX}:${salt}:${hash}`;
  }

  compare(plainPassword: string, hashedPassword: string): boolean {
    if (hashedPassword.startsWith(`${SCRYPT_PREFIX}:`)) {
      return this.compareScrypt(plainPassword, hashedPassword);
    }

    return this.compareLegacy(plainPassword, hashedPassword);
  }

  needsRehash(hashedPassword: string): boolean {
    return !hashedPassword.startsWith(`${SCRYPT_PREFIX}:`);
  }

  private compareScrypt(
    plainPassword: string,
    hashedPassword: string,
  ): boolean {
    const [, salt, hash] = hashedPassword.split(':');

    if (!salt || !hash) {
      return false;
    }

    const attempt = scryptSync(plainPassword, salt, SCRYPT_KEY_LENGTH);
    const hashBuffer = Buffer.from(hash, 'hex');

    if (hashBuffer.length !== attempt.length) {
      return false;
    }

    return timingSafeEqual(hashBuffer, attempt);
  }

  private compareLegacy(
    plainPassword: string,
    hashedPassword: string,
  ): boolean {
    const [salt, hash] = hashedPassword.split(':');

    if (!salt || !hash) {
      return false;
    }

    const attempt = createHmac('sha256', salt)
      .update(plainPassword)
      .digest('hex');

    const hashBuffer = Buffer.from(hash, 'hex');
    const attemptBuffer = Buffer.from(attempt, 'hex');

    if (hashBuffer.length !== attemptBuffer.length) {
      return false;
    }

    return timingSafeEqual(hashBuffer, attemptBuffer);
  }
}
