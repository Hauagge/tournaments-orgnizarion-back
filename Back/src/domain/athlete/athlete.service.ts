import { Injectable, Logger } from '@nestjs/common';
import { Athlete } from './entities/athlete.entity';
import { ListAthletesDTO } from './dto/list-athletes.dto';
import { AthleteRepository } from './repository/athlete.repository';
import { BracketRepository } from '../bracket/repository/bracket.repository';
import { BeltRepository } from '../belt/repository/belt.repository';
import { CreateAthleteDTO } from './dto/create-athlete.dto';
import { Bracket } from '../bracket/entities/bracket.entity';
import { Fight } from '../fight/entities/fight.entinty';
import { generateSubscriptionNumber } from 'src/core/helper/genarate-number.helper';
import { CategoryRepository } from '../category/repository/category.repository';

type AthleteSlot = 'athlete1Id' | 'athlete2Id';

@Injectable()
export class AthleteService {
  constructor(
    private readonly repo: AthleteRepository,
    private readonly bracketRepository: BracketRepository,
    private readonly beltRepository: BeltRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async create(data: CreateAthleteDTO) {
    const belt = await this.beltRepository.findByColor(data.beltColor);

    if (!belt) {
      throw new Error('Belt not found');
    }

    const category = await this.categoryRepository.findByAgeAndWeight(
      data.age,
      data.weight,
    );

    if (!category) {
      throw new Error('Category not found');
    }
    const subscriptionNumber = await generateSubscriptionNumber();
    const athlete = await this.repo.createAthlete({
      ...data,
      categoryId: category.id,
      beltId: belt.id,
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
    const category = await this.categoryRepository.findByAgeAndWeight(
      athlete.age,
      athlete.weight,
    );
    if (!category) {
      throw new Error('Category not found');
    }
    const bracket = await this.bracketRepository.findByCategory(category.id);

    if (!bracket) {
      throw new Error('Bracket not found');
    }

    athlete.fightBracketId = bracket.id;

    await this.linkAthleteToAFight(athlete.id, bracket);

    await this.repo.update(athlete.id, athlete);
    return athlete;
  }

  async findAll(query: ListAthletesDTO) {
    return this.repo.find(query);
  }

  async linkAthleteToAFight(athleteId: number, bracket: Bracket) {
    const slots: Array<AthleteSlot> = ['athlete1Id', 'athlete2Id'];

    const hasFightsWithMissingAthletes =
      bracket.fights.filter((fight) => {
        return fight.athlete1Id === null || fight.athlete2Id === null;
      }).length > 0;

    if (hasFightsWithMissingAthletes) {
      const fight = bracket.fights.find((fight) => {
        return fight.athlete1Id === null || fight.athlete2Id === null;
      });
      if (!fight) {
        Logger.error('No Bracket found with missing athletes');
        return;
      }

      for (const slot of slots) {
        if (!fight[slot]) {
          fight[slot] = athleteId;
          await this.repo.update(fight.id, fight);
          return;
        }
      }
      await this.repo.update(fight.id, fight);
    } else {
      const fight = new Fight();
      fight.athlete1Id = athleteId;
      fight.bracketId = bracket.id;
      await this.repo.createAthlete(fight);
      bracket.fights.push(fight);
      await this.bracketRepository.update(bracket.id, bracket);
    }
  }
}
