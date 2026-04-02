import { Injectable } from '@nestjs/common';
import { Competition } from '../../domain/entities/competition.entity';

@Injectable()
export class CompetitionTeamsHydratorService {
  async attachTeams(competition: Competition): Promise<Competition> {
    return competition;
  }

  async attachTeamsToMany(competitions: Competition[]): Promise<Competition[]> {
    return competitions;
  }
}
