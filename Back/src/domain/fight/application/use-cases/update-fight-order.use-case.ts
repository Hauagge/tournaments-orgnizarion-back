import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { IFightRepository } from '../../repository/IFightRepository.repository';

export type UpdateFightOrderInput = {
  currentUserId: number;
  competitionId: number;
  items: Array<{
    fightId: number;
    orderIndex: number;
  }>;
};

export type UpdateFightOrderView = {
  competitionId: number;
  totalUpdated: number;
  items: Array<{
    fightId: number;
    orderIndex: number;
  }>;
};

@Injectable()
export class UpdateFightOrderUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: UpdateFightOrderInput): Promise<UpdateFightOrderView> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const access =
      await this.userCompetitionRepository.findByUserIdAndCompetitionId({
        userId: input.currentUserId,
        competitionId: input.competitionId,
      });

    if (!access) {
      throw new ForbiddenException(
        'Usuario autenticado nao possui acesso a esta competicao',
      );
    }

    this.assertNoDuplicatedFightIds(input.items);
    this.assertNoDuplicatedOrderIndexes(input.items);

    const competitionFights = await this.fightRepository.listByCompetitionId({
      competitionId: input.competitionId,
    });
    const fightIdsFromCompetition = new Set(
      competitionFights
        .map((fight) => fight.id)
        .filter((id): id is number => id !== undefined),
    );
    const invalidFightIds = input.items
      .map((item) => item.fightId)
      .filter((fightId) => !fightIdsFromCompetition.has(fightId));

    if (invalidFightIds.length > 0) {
      throw new ValidationError(
        'Uma ou mais lutas não pertencem à competição informada.',
        {
          fightIds: invalidFightIds,
        },
      );
    }

    const normalizedItems = [...input.items].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    );

    await this.fightRepository.updateOrder(normalizedItems);

    const result = {
      competitionId: input.competitionId,
      totalUpdated: normalizedItems.length,
      items: normalizedItems,
    };

    await this.eventBus.publish({
      name: 'fights.order.updated',
      payload: {
        competitionId: input.competitionId,
      },
      occurredAt: new Date(),
    });

    return result;
  }

  private assertNoDuplicatedFightIds(
    items: UpdateFightOrderInput['items'],
  ): void {
    const uniqueIds = new Set(items.map((item) => item.fightId));

    if (uniqueIds.size !== items.length) {
      throw new ValidationError('Payload possui lutas duplicadas.');
    }
  }

  private assertNoDuplicatedOrderIndexes(
    items: UpdateFightOrderInput['items'],
  ): void {
    const uniqueIndexes = new Set(items.map((item) => item.orderIndex));

    if (uniqueIndexes.size !== items.length) {
      throw new ValidationError('Payload possui posições de ordem duplicadas.');
    }
  }
}
