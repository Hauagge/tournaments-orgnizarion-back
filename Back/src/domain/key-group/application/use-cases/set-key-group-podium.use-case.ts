import { Inject, Injectable } from '@nestjs/common';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { IKeyGroupRepository } from '../../repository/IKeyGroupRepository.repository';
import { KeyGroupChampionService } from '../services/key-group-champion.service';

export type SetKeyGroupPodiumInput = {
  id: number;
  firstAthleteId: number | null;
  secondAthleteId: number | null;
};

/**
 * Marca a mao o primeiro e o segundo colocado de uma chave. Vale mesmo com a
 * chave travada: e durante as lutas que a mesa precisa disso.
 */
@Injectable()
export class SetKeyGroupPodiumUseCase {
  constructor(
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    private readonly keyGroupChampionService: KeyGroupChampionService,
  ) {}

  async execute(input: SetKeyGroupPodiumInput): Promise<KeyGroup> {
    const group = await this.keyGroupRepository.findById(input.id);

    if (!group) {
      throw new NotFoundError(`Key group with id ${input.id} not found`);
    }

    if (
      input.firstAthleteId !== null &&
      input.firstAthleteId === input.secondAthleteId
    ) {
      throw new ValidationError(
        'First and second place must be different athletes',
      );
    }

    const members = await this.keyGroupRepository.listMembersByKeyGroupId(
      input.id,
    );
    const memberIds = new Set(members.map((member) => member.athleteId));

    for (const athleteId of [input.firstAthleteId, input.secondAthleteId]) {
      if (athleteId !== null && !memberIds.has(athleteId)) {
        throw new ValidationError(
          `Athlete ${athleteId} does not belong to this key group`,
        );
      }
    }

    return this.keyGroupRepository.update(
      group.setManualPodium({
        firstAthleteId: input.firstAthleteId,
        secondAthleteId: input.secondAthleteId,
        // Sem primeiro marcado, o campeao volta a ser o que as lutas dizem.
        championAthleteId:
          input.firstAthleteId ??
          this.keyGroupChampionService.resolve(
            await this.fightRepository.listByKeyGroupId(input.id),
          ),
      }),
    );
  }
}
