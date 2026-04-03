import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './core/middlewares';
import { DatabaseModule } from './database/database.module';
import { AcademyModule } from './domain/academy/academy.module';
import { AreaModule } from './domain/area/area.module';
import { AthleteModule } from './domain/athlete/athlete.module';
import { AuthModule } from './domain/auth/auth.module';
import { CategoryModule } from './domain/category/category.module';
import { CompetitionModule } from './domain/competition/competition.module';
import { FightModule } from './domain/fight/fight.module';
import { KeyGroupModule } from './domain/key-group/key-group.module';
import { ReportsPdfModule } from './domain/reports-pdf/reports-pdf.module';
import { ScoreboardModule } from './domain/scoreboard/scoreboard.module';
import { WeighInModule } from './domain/weighin/weighin.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CompetitionModule,
    CategoryModule,
    AthleteModule,
    AcademyModule,
    KeyGroupModule,
    ReportsPdfModule,
    ScoreboardModule,
    FightModule,
    AreaModule,
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
