import { Injectable, Logger } from '@nestjs/common';
import { Athlete } from './entities/athlete.entity';
import { ListAthletesDTO } from './dto/list-athletes.dto';
import { AthleteRepository } from './repository/athlete.repository';
import { CreateAthleteDTO } from './dto/create-athlete.dto';
import { generateSubscriptionNumber } from 'src/core/helper/genarate-number.helper';

type AthleteSlot = 'athlete1Id' | 'athlete2Id';

@Injectable()
export class AthleteService {
  constructor(private readonly repo: AthleteRepository) {}

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
    return this.repo.update(id, athlete);
  }

  async setAthleteOnBrackets(athlete: Athlete) {
    await this.repo.update(athlete.id, athlete);
    return athlete;
  }

  async findAll(query: ListAthletesDTO) {
    return this.repo.find(query);
  }
}
