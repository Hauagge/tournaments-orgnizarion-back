import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './domain/auth/auth.module';
import { CompetitionModule } from './domain/competition/competition.module';

@Module({
  imports: [DatabaseModule, AuthModule, CompetitionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
