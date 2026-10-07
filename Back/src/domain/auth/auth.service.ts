import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '../../core/auth/infra/services/jwt-token.service';
import { LoginDto } from './dto/login.dto';
import { IUserRepository } from './repository/IUserRepository.repository';
import { IPasswordHasher } from './services/IPasswordHasher.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async login(data: LoginDto) {
    const user = await this.userRepository.findByUsername(data.username);

    if (
      !user ||
      !this.passwordHasher.compare(data.password, user.passwordHash)
    ) {
      throw new UnauthorizedException('Usuário ou senha inválidos');
    }

    await this.rehashPasswordIfNeeded(
      user.id,
      data.password,
      user.passwordHash,
    );

    const competitionIds = this.extractCompetitionIds(user);
    const academyId = user.academyId ?? null;

    const token = this.jwtTokenService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      academyId,
      competitionIds,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, //  8 horas
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        academyId,
        competitionIds,
      },
    };
  }

  private async rehashPasswordIfNeeded(
    userId: number,
    plainPassword: string,
    currentPasswordHash: string,
  ): Promise<void> {
    if (!this.passwordHasher.needsRehash(currentPasswordHash)) {
      return;
    }

    try {
      const newPasswordHash = this.passwordHasher.hash(plainPassword);
      await this.userRepository.updatePasswordHash(userId, newPasswordHash);
    } catch {
      // Best-effort: a falha ao persistir o novo hash não deve impedir o login,
      // já que o usuário foi autenticado com sucesso.
    }
  }

  private extractCompetitionIds(user: {
    competitionLinks?: Array<{ competitionId: number }>;
  }): number[] {
    const linkedCompetitionIds =
      user.competitionLinks?.map((link) => link.competitionId) ?? [];

    return Array.from(new Set(linkedCompetitionIds)).sort((a, b) => a - b);
  }
}
