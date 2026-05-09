import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class JwtTokenService {
  verify(token: string): AuthenticatedUser {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('Token inválido');
    }

    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = createHmac('sha256', this.getSecret())
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

  private getSecret(): string {
    return process.env.AUTH_SECRET || 'dev-auth-secret';
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
