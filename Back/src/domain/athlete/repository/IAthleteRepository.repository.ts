import { Athlete } from '../domain/entities/athlete.entity';

export abstract class IAthleteRepository {
  abstract create(athlete: Athlete): Promise<Athlete>;
  abstract update(athlete: Athlete): Promise<Athlete>;
  abstract findById(id: number): Promise<Athlete | null>;
  abstract search(input: {
    competitionId: number;
    query?: string;
    teamId?: number;
  }): Promise<Athlete[]>;
}
