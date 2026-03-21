import { WeighIn } from '../../../src/domain/weighin/domain/entities/weigh-in.entity';
import { IWeighInRepository } from '../../../src/domain/weighin/repository/IWeighInRepository.repository';

export class InMemoryWeighInRepository implements IWeighInRepository {
  private weighIns: WeighIn[] = [];
  private nextId = 1;

  constructor(seed: WeighIn[] = []) {
    this.setWeighIns(seed);
  }

  setWeighIns(weighIns: WeighIn[]) {
    this.weighIns = [...weighIns];
    this.nextId =
      weighIns.reduce((max, weighIn) => Math.max(max, weighIn.id ?? 0), 0) + 1;
  }

  async save(weighIn: WeighIn): Promise<WeighIn> {
    const entity = weighIn.id
      ? weighIn
      : WeighIn.restore({
          ...weighIn.toJSON(),
          id: this.nextId++,
        });

    const index = this.weighIns.findIndex(
      (item) =>
        item.competitionId === entity.competitionId &&
        item.athleteId === entity.athleteId,
    );

    if (index >= 0) {
      this.weighIns[index] = entity;
      return entity;
    }

    this.weighIns.push(entity);
    return entity;
  }

  async findByCompetitionIdAndAthleteId(
    competitionId: number,
    athleteId: number,
  ): Promise<WeighIn | null> {
    return (
      this.weighIns.find(
        (weighIn) =>
          weighIn.competitionId === competitionId &&
          weighIn.athleteId === athleteId,
      ) ?? null
    );
  }

  async findByCompetitionIdAndAthleteIds(
    competitionId: number,
    athleteIds: number[],
  ): Promise<WeighIn[]> {
    return this.weighIns.filter(
      (weighIn) =>
        weighIn.competitionId === competitionId &&
        athleteIds.includes(weighIn.athleteId),
    );
  }
}
