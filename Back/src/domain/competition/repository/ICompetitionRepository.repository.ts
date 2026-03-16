import { Competition } from '../domain/entities/competition.entity';

export abstract class ICompetitionRepository {
  abstract create(competition: Competition): Promise<Competition>;
  abstract update(competition: Competition): Promise<Competition>;
  abstract findById(id: number): Promise<Competition | null>;
  abstract list(input: {
    page: number;
    pageSize: number;
  }): Promise<[Competition[], number]>;
}
