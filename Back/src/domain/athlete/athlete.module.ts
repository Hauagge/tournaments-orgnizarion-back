import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AthleteController } from './athlete.controller';
import { AthleteService } from './athlete.service';
import { Athlete } from './entities/athlete.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Athlete])],
  controllers: [AthleteController],
  providers: [AthleteService],
})
export class AthleteModule {}
