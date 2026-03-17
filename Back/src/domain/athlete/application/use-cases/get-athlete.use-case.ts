import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Athlete } from '../../domain/entities/athlete.entity';
import { IAthleteRepository } from '../../repository/IAthleteRepository.repository';

@Injectable()
export class GetAthleteUseCase {
  constructor(
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
  ) {}

  async execute(id: number): Promise<Athlete> {
    const athlete = await this.athleteRepository.findById(id);

    if (!athlete) {
      throw new NotFoundError(`Athlete with id ${id} not found`);
    }

    return athlete;
  }
}
