import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuthenticatedUser } from '../types/authenticated-user.type';

const MIN_SECRET_LENGTH = 32;

@Injectable()
export class JwtTokenService {
  private readonly secret: string;

  constructor() {
    const secret = process.env.AUTH_SECRET;

    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        'AUTH_SECRET deve estar definido com pelo menos 32 caracteres. Configure a variável de ambiente antes de iniciar a aplicação.',
      );
    }

    this.secret = secret;
  }

  sign(payload: Record<string, unknown>): string {
    const header = { alg: 'HS256', typ: 'JWT' };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const unsigned = `${encodedHeader}.${encodedPayload}`;

    const signature = createHmac('sha256', this.secret)
      .update(unsigned)
      .digest('base64url');

    return `${unsigned}.${signature}`;
  }

  verify(token: string): AuthenticatedUser {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('Token inválido');
    }

    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = createHmac('sha256', this.secret)
      .update(unsignedToken)
      .digest('base64url');

    const isValidSignature = this.safeCompare(signature, expectedSignature);
    if (!isValidSignature) {
      throw new UnauthorizedException('Token inválido');
    }

    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString(
      'utf8',
    );
    const payload = JSON.parse(payloadJson) as Partial<AuthenticatedUser>;

    if (!payload.sub || !payload.username || !payload.role || !payload.exp) {
      throw new UnauthorizedException('Token inválido');
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expirado');
    }

    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
      academyId: payload.academyId ?? null,
      competitionIds: this.normalizeCompetitionIds(payload),
      exp: payload.exp,
    };
  }

  private normalizeCompetitionIds(
    payload: Partial<AuthenticatedUser> & { competitionId?: number | null },
  ): number[] {
    if (Array.isArray(payload.competitionIds)) {
      return payload.competitionIds.filter(
        (competitionId): competitionId is number =>
          typeof competitionId === 'number',
      );
    }

    if (typeof payload.competitionId === 'number') {
      return [payload.competitionId];
    }

    return [];
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value).toString('base64url');
  }

  private safeCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) {
      return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
  }
}
