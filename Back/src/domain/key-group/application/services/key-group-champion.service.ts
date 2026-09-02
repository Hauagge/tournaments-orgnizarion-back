import { Injectable } from '@nestjs/common';
import { CategoryPodiumService } from '@/domain/fight/application/services/category-podium.service';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';

/**
 * Decide o campeao de uma chave a partir das suas lutas. So responde quando a
 * chave esta inteira decidida; enquanto houver luta em aberto devolve null.
 *
 * O criterio de "qual luta vale titulo" mora no CategoryPodiumService, que e a
 * unica fonte de verdade — aqui so se extrai o primeiro lugar dele.
 */
@Injectable()
export class KeyGroupChampionService {
  constructor(
    private readonly categoryPodiumService: CategoryPodiumService = new CategoryPodiumService(),
  ) {}

  resolve(fights: FightEntity[]): number | null {
    const podium = this.categoryPodiumService.resolve(fights);

    return podium.decided ? podium.firstAthleteId : null;
  }
}
