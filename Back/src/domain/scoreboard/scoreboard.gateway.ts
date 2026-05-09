import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '@/core/auth/infra/services/jwt-token.service';
import { AuthenticatedUser } from '@/core/auth/infra/types/authenticated-user.type';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { IAreaRepository } from '@/domain/area/repository/IAreaRepository.repository';
import { Server, Socket } from 'socket.io';

type JoinRoomPayload = {
  competitionId?: number;
  areaId?: number;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ScoreboardGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ScoreboardGateway.name);

  constructor(
    private readonly jwtTokenService: JwtTokenService,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
    @Inject(IAreaRepository)
    private readonly areaRepository: IAreaRepository,
  ) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('Token nao informado');
      }

      client.data.user = this.jwtTokenService.verify(token);
      this.logger.log(
        `Client connected: ${client.id} user=${client.data.user.sub}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha na autenticacao do socket';

      this.logger.warn(
        `Socket auth failed: client=${client.id} reason=${message}`,
      );
      client.emit('error', { message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinCompetitionRoom')
  async joinCompetitionRoom(
    @MessageBody() payload: JoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload?.competitionId) {
      return {
        ok: false,
        message: 'competitionId is required',
      };
    }

    const user = this.getAuthenticatedUser(client);
    const hasAccess = await this.userHasCompetitionAccess(
      user.sub,
      payload.competitionId,
    );

    if (!hasAccess) {
      return {
        ok: false,
        message: 'forbidden',
      };
    }

    const room = this.getCompetitionRoom(payload.competitionId);
    await client.join(room);

    return {
      ok: true,
      room,
    };
  }

  @SubscribeMessage('joinAreaRoom')
  async joinAreaRoom(
    @MessageBody() payload: JoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload?.areaId) {
      return {
        ok: false,
        message: 'areaId is required',
      };
    }

    const user = this.getAuthenticatedUser(client);
    const area = await this.areaRepository.findById(payload.areaId);

    if (!area) {
      return {
        ok: false,
        message: 'area not found',
      };
    }

    const hasAccess = await this.userHasCompetitionAccess(
      user.sub,
      area.competitionId,
    );

    if (!hasAccess) {
      return {
        ok: false,
        message: 'forbidden',
      };
    }

    const room = this.getAreaRoom(payload.areaId);
    await client.join(room);

    return {
      ok: true,
      room,
    };
  }

  broadcastToCompetition(eventName: string, competitionId: number, payload: unknown) {
    this.server.to(this.getCompetitionRoom(competitionId)).emit(eventName, payload);
  }

  broadcastToArea(eventName: string, areaId: number, payload: unknown) {
    this.server.to(this.getAreaRoom(areaId)).emit(eventName, payload);
  }

  private getCompetitionRoom(competitionId: number): string {
    return `competition:${competitionId}`;
  }

  private getAreaRoom(areaId: number): string {
    return `area:${areaId}`;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return this.normalizeBearerToken(authToken);
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.length > 0) {
      return this.normalizeBearerToken(authorization);
    }

    return null;
  }

  private normalizeBearerToken(value: string): string | null {
    const [type, token] = value.split(' ');
    if (type === 'Bearer' && token) {
      return token;
    }

    return value.trim() || null;
  }

  private getAuthenticatedUser(client: Socket): AuthenticatedUser {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new WsException('unauthorized');
    }

    return user;
  }

  private async userHasCompetitionAccess(
    userId: number,
    competitionId: number,
  ): Promise<boolean> {
    const access =
      await this.userCompetitionRepository.findByUserIdAndCompetitionId({
        userId,
        competitionId,
      });

    return Boolean(access);
  }
}
