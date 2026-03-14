import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AthleteController } from './athlete.controller';
import { AthleteService } from './athlete.service';
import { Athlete } from './entities/athlete.entity';
import { IAthleteRepository } from './repository/IAthleteRepository.repository';
import { AthleteRepository } from './repository/athlete.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Athlete])],
  controllers: [AthleteController],
  providers: [
    AthleteService,
    {
      provide: IAthleteRepository,
      useClass: AthleteRepository,
    },
  ],
})
export class AthleteModule {}
