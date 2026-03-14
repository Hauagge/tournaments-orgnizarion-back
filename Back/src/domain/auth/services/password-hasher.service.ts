import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { IPasswordHasher } from './IPasswordHasher.service';

@Injectable()
export class PasswordHasherService implements IPasswordHasher {
  hash(plainPassword: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHmac('sha256', salt).update(plainPassword).digest('hex');
    return `${salt}:${hash}`;
  }

  compare(plainPassword: string, hashedPassword: string): boolean {
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
