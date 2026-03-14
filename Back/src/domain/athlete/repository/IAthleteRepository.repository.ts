import { Athlete } from '../entities/athlete.entity';

export abstract class IAthleteRepository {
  abstract findById(id: number): Promise<Athlete | null>;
  abstract createAthlete(data: Partial<Athlete>): Promise<Athlete>;
  abstract updateAthlete(
    id: number,
    data: Partial<Athlete>,
  ): Promise<Athlete | null>;
  abstract find(query: any): Promise<Athlete[]>;
}

