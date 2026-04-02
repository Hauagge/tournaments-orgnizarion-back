import { Area } from '../domain/entities/area.entity';

export abstract class IAreaRepository {
  abstract createMany(areas: Area[]): Promise<Area[]>;
  abstract findById(id: number): Promise<Area | null>;
  abstract listByCompetitionId(competitionId: number): Promise<Area[]>;
}
