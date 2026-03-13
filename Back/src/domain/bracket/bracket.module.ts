import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bracket } from './entities/bracket.entity';
import { Category } from '../category/entities/categoory.entitty';
import { BracketController } from './bracket.controller';
import { BracketService } from './bracket.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bracket, Category])],
  controllers: [BracketController],
  providers: [BracketService],
})
export class AthleteModule {}
