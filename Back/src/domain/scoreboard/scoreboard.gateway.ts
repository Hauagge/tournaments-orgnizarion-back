import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
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

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
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
}
