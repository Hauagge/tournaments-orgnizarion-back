import { Module } from '@nestjs/common';
import { EventBusModule } from '@/core/events/event-bus.module';
import { AreaProviderModule } from '../area/area-provider.module';
import { ScoreboardEventRelayService } from './application/services/scoreboard-event-relay.service';
import { ScoreboardGateway } from './scoreboard.gateway';

@Module({
  imports: [EventBusModule, AreaProviderModule],
  providers: [ScoreboardGateway, ScoreboardEventRelayService],
  exports: [ScoreboardGateway],
})
export class ScoreboardModule {}
