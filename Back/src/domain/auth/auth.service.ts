import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { IUserRepository } from './repository/IUserRepository.repository';
import { IPasswordHasher } from './services/IPasswordHasher.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async login(data: LoginDto) {
    const user = await this.userRepository.findByUsername(data.username);

    if (!user || !this.passwordHasher.compare(data.password, user.passwordHash)) {
      throw new UnauthorizedException('Usuário ou senha inválidos');
    }

    const token = this.signToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, //  8 horas
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  private signToken(payload: Record<string, unknown>): string {
    const secret = process.env.AUTH_SECRET || 'dev-auth-secret';
    const header = { alg: 'HS256', typ: 'JWT' };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const unsigned = `${encodedHeader}.${encodedPayload}`;

    const signature = createHmac('sha256', secret)
      .update(unsigned)
      .digest('base64url');

    return `${unsigned}.${signature}`;
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value).toString('base64url');
  }
}
