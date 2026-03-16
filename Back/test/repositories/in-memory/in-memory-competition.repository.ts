import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { Competition } from '../../../src/domain/competition/domain/entities/competition.entity';
import { ICompetitionRepository } from '../../../src/domain/competition/repository/ICompetitionRepository.repository';
import { makeCompetition } from '../../factories';

export class InMemoryCompetitionRepository
  implements ICompetitionRepository
{
  private competitions: Competition[] = [];
  private nextId = 1;

  constructor(seed: Competition[] = []) {
    this.setCompetitions(seed);
  }

  setCompetitions(competitions: Competition[]) {
    this.competitions = [...competitions];
    this.nextId =
      competitions.reduce(
        (max, competition) => Math.max(max, competition.id ?? 0),
        0,
      ) + 1;
  }

  async create(competition: Competition): Promise<Competition> {
    const createdCompetition = makeCompetition({
      ...competition.toJSON(),
      id: this.nextId++,
    });

    this.competitions.push(createdCompetition);
    return createdCompetition;
  }

  async update(competition: Competition): Promise<Competition> {
    const index = this.competitions.findIndex(
      (item) => item.id === competition.id,
    );

    if (index < 0) {
      throw new NotFoundError(
        `Competition with id ${competition.id as number} not found`,
      );
    }

    this.competitions[index] = competition;
    return competition;
  }

  async findById(id: number): Promise<Competition | null> {
    return this.competitions.find((competition) => competition.id === id) ?? null;
  }

  async list(input: {
    page: number;
    pageSize: number;
  }): Promise<[Competition[], number]> {
    const total = this.competitions.length;
    const start = (input.page - 1) * input.pageSize;
    const end = start + input.pageSize;
    const items = [...this.competitions]
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .slice(start, end);

    return [items, total];
  }
}
