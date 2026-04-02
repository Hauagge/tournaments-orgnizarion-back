import { Academy } from '../domain/entities/academy.entity';

export abstract class IAcademyRepository {
  abstract create(academy: Academy): Promise<Academy>;
  abstract update(academy: Academy): Promise<Academy>;
  abstract findById(id: number): Promise<Academy | null>;
  abstract findByCompetitionIdAndName(
    competitionId: number,
    name: string,
  ): Promise<Academy | null>;
  abstract findByCompetitionIdAndNames(
    competitionId: number,
    names: string[],
  ): Promise<Academy[]>;
  abstract listByCompetitionId(competitionId: number): Promise<Academy[]>;
}
