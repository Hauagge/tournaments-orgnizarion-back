import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventBus } from '@/core/events/event-bus.interface';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { AreaQueueItemTypeOrmEntity } from '@/domain/area/infra/persistence/entities/area-queue-item.typeorm-entity';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { CategoryTypeOrmEntity } from '@/domain/category/infra/persistence/entities/category.typeorm-entity';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { FightTypeOrmEntity } from '../../entities/fight.typeorm-entity';

type Input = {
  currentUserId: number;
  competitionId: number;
  fightId: number;
  winnerId: number;
  winType?: string | null;
};

type Output = {
  fight: {
    id: number;
    status: FightStatus;
    winnerId: number | null;
    loserId: number | null;
  };
  nextFight: {
    id: number;
    athleteAId: number | null;
    athleteBId: number | null;
  } | null;
  categoryChampion: {
    categoryId: number;
    athleteId: number;
  } | null;
};

@Injectable()
export class MarkFightWinnerUseCase {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: Input): Promise<Output> {
    await this.assertAccess(input.currentUserId, input.competitionId);

    const result = await this.dataSource.transaction(async (manager) => {
      const fightRepository = manager.getRepository(FightTypeOrmEntity);
      const categoryRepository = manager.getRepository(CategoryTypeOrmEntity);
      const areaQueueRepository = manager.getRepository(AreaQueueItemTypeOrmEntity);

      const fight = await fightRepository.findOneBy({ id: input.fightId });
      if (!fight || fight.competitionId !== input.competitionId) {
        throw new NotFoundError(`Fight with id ${input.fightId} not found`);
      }

      if (fight.status === FightStatus.CANCELED) {
        throw new ValidationError('Nao e possivel marcar vencedor de luta cancelada');
      }

      const participants = [fight.athleteAId, fight.athleteBId].filter(
        (athleteId): athleteId is number => athleteId !== null,
      );
      if (!participants.includes(input.winnerId)) {
        throw new ValidationError('O vencedor informado nao pertence a luta');
      }

      const loserId = participants.find((athleteId) => athleteId !== input.winnerId) ?? null;
      let nextFight = fight.nextFightId
        ? await fightRepository.findOneBy({ id: fight.nextFightId })
        : null;
      const previousWinnerId = fight.winnerId;

      if (fight.status === FightStatus.FINISHED && previousWinnerId !== null && previousWinnerId !== input.winnerId) {
        if (nextFight?.status === FightStatus.FINISHED) {
          throw new ValidationError(
            'Nao e possivel alterar o vencedor porque a proxima luta ja foi finalizada.',
          );
        }

        if (nextFight && fight.nextFightSlot) {
          if (fight.nextFightSlot === 'A' && nextFight.athleteAId === previousWinnerId) {
            nextFight.athleteAId = null;
          }
          if (fight.nextFightSlot === 'B' && nextFight.athleteBId === previousWinnerId) {
            nextFight.athleteBId = null;
          }
        }
      }

      fight.winnerId = input.winnerId;
      fight.loserId = loserId;
      fight.status = FightStatus.FINISHED;
      fight.isWo = loserId === null;
      fight.winType = input.winType ?? (loserId === null ? 'WO' : fight.winType);
      fight.finishedAt = new Date();
      if (!fight.startedAt) {
        fight.startedAt = new Date();
      }

      let champion: Output['categoryChampion'] = null;

      if (nextFight) {
        if (!fight.nextFightSlot) {
          throw new ValidationError('A luta atual nao possui slot configurado para a proxima luta');
        }

        const currentSlotValue =
          fight.nextFightSlot === 'A' ? nextFight.athleteAId : nextFight.athleteBId;
        if (
          currentSlotValue !== null &&
          currentSlotValue !== previousWinnerId &&
          currentSlotValue !== input.winnerId
        ) {
          throw new ValidationError('O slot da proxima luta ja esta ocupado por outro atleta');
        }

        if (fight.nextFightSlot === 'A') {
          nextFight.athleteAId = input.winnerId;
        } else {
          nextFight.athleteBId = input.winnerId;
        }

        await fightRepository.save(nextFight);
      } else if (fight.categoryId !== null) {
        const category = await categoryRepository.findOneBy({ id: fight.categoryId });
        if (category) {
          category.championAthleteId = input.winnerId;
          await categoryRepository.save(category);
          champion = {
            categoryId: category.id,
            athleteId: input.winnerId,
          };
        }
      }

      await fightRepository.save(fight);

      const queueItem = await areaQueueRepository.findOneBy({ fightId: fight.id });
      if (queueItem) {
        queueItem.status = AreaQueueItemStatus.DONE;
        await areaQueueRepository.save(queueItem);
      }

      return {
        fight,
        nextFight,
        categoryChampion: champion,
        queueItem,
      };
    });

    await this.eventBus.publish({
      name: 'fight.finished',
      payload: {
        fightId: result.fight.id,
        competitionId: input.competitionId,
        winnerAthleteId: result.fight.winnerId,
        winType: result.fight.winType,
      },
      occurredAt: new Date(),
    });

    if (result.queueItem) {
      await this.eventBus.publish({
        name: 'queue.updated',
        payload: {
          competitionId: input.competitionId,
          areaId: result.queueItem.areaId,
          fightId: result.fight.id,
          queueItemId: result.queueItem.id,
          status: 'DONE',
        },
        occurredAt: new Date(),
      });
    }

    return {
      fight: {
        id: result.fight.id,
        status: result.fight.status,
        winnerId: result.fight.winnerId,
        loserId: result.fight.loserId,
      },
      nextFight: result.nextFight
        ? {
            id: result.nextFight.id,
            athleteAId: result.nextFight.athleteAId,
            athleteBId: result.nextFight.athleteBId,
          }
        : null,
      categoryChampion: result.categoryChampion,
    };
  }

  private async assertAccess(userId: number, competitionId: number) {
    const competition = await this.competitionRepository.findById(competitionId);
    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    const access =
      await this.userCompetitionRepository.findByUserIdAndCompetitionId({
        userId,
        competitionId,
      });

    if (!access) {
      throw new ForbiddenException(
        'Usuario autenticado nao possui acesso a esta competicao',
      );
    }
  }
}
