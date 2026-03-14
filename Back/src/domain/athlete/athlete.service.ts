import { Injectable } from '@nestjs/common';
import { Athlete } from './entities/athlete.entity';
import { ListAthletesDTO } from './dto/list-athletes.dto';
import { IAthleteRepository } from './repository/IAthleteRepository.repository';
import { CreateAthleteDTO } from './dto/create-athlete.dto';
import { generateSubscriptionNumber } from 'src/core/helper/genarate-number.helper';

@Injectable()
export class AthleteService {
  constructor(private readonly repo: IAthleteRepository) {}

  async create(data: CreateAthleteDTO) {
    const subscriptionNumber = await generateSubscriptionNumber();
    const athlete = await this.repo.createAthlete({
      ...data,
      subscriptionNumber,
    });
    return athlete;
  }

  async confirmWeighIn(id: number, eligible: boolean) {
    const athlete = await this.repo.findById(id);
    if (!athlete) {
      throw new Error('Athlete not found');
    }

    if (eligible) {
      await this.setAthleteOnBrackets(athlete);
    }
    athlete.weighInConfirmed = true;
    athlete.eligible = eligible;
    return this.repo.updateAthlete(id, athlete);
  }

  async setAthleteOnBrackets(athlete: Athlete) {
    await this.repo.updateAthlete(athlete.id, athlete);
    return athlete;
  }

  async findAll(query: ListAthletesDTO) {
    return this.repo.find(query);
  }
}
