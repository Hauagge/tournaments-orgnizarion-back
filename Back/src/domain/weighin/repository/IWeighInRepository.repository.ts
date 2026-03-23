import { WeighIn } from '../domain/entities/weigh-in.entity';

export abstract class IWeighInRepository {
  abstract save(weighIn: WeighIn): Promise<WeighIn>;
  abstract findByCompetitionIdAndAthleteId(
    competitionId: number,
    athleteId: number,
  ): Promise<WeighIn | null>;
  abstract findByCompetitionIdAndAthleteIds(
    competitionId: number,
    athleteIds: number[],
  ): Promise<WeighIn[]>;
  abstract hasAnyForCompetition(competitionId: number): Promise<boolean>;
}
