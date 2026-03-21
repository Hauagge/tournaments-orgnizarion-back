import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AthleteModule } from './domain/athlete/athlete.module';
import { AuthModule } from './domain/auth/auth.module';
import { CompetitionModule } from './domain/competition/competition.module';
import { TeamModule } from './domain/team/team.module';
import { WeighInModule } from './domain/weighin/weighin.module';
import { LoggerMiddleware } from './core/middlewares';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CompetitionModule,
    AthleteModule,
    TeamModule,
    WeighInModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .exclude({ path: '/health-check', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
