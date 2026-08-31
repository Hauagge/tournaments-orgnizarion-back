import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventBus } from '@/core/events/event-bus.interface';
import { AreaQueueItemTypeOrmEntity } from '@/domain/area/infra/persistence/entities/area-queue-item.typeorm-entity';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { KeyGroupChampionService } from '@/domain/key-group/application/services/key-group-champion.service';
import { KeyGroupTypeOrmEntity } from '@/domain/key-group/infra/persistence/entities/key-group.typeorm-entity';
import { CategoryTypeOrmEntity } from '@/domain/category/infra/persistence/entities/category.typeorm-entity';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { BestOfThreeProgressionService } from '../services/best-of-three-progression.service';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { FightTypeOrmEntity } from '../../entities/fight.typeorm-entity';
import { FightMapper } from '../../infra/persistence/mappers/fight.mapper';

type Input = {
  currentUserId?: number;
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
    keyGroupId: number | null;
    round: number;
    orderIndex: number;
    athleteAId: number | null;
    athleteBId: number | null;
    status: FightStatus;
    areaId: number | null;
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
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
    private readonly bestOfThreeProgressionService: BestOfThreeProgressionService,
    private readonly keyGroupChampionService: KeyGroupChampionService,
  ) {}

  async execute(input: Input): Promise<Output> {
    const result = await this.dataSource.transaction(async (manager) => {
      const fightRepository = manager.getRepository(FightTypeOrmEntity);
      const categoryRepository = manager.getRepository(CategoryTypeOrmEntity);
      const areaQueueRepository = manager.getRepository(AreaQueueItemTypeOrmEntity);
      const keyGroupRepository = manager.getRepository(KeyGroupTypeOrmEntity);

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
      let vacatedAreaId: number | null = null;

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

        if (fight.areaId !== null && nextFight.areaId !== fight.areaId) {
          vacatedAreaId = nextFight.areaId;
          nextFight.areaId = fight.areaId;
        }

        await fightRepository.save(nextFight);

        if (nextFight.areaId !== null) {
          await this.enqueueFightInArea({
            fightId: nextFight.id,
            areaId: nextFight.areaId,
            areaQueueRepository,
          });
        }
      }

      if (fight.loserNextFightId && fight.loserNextFightSlot && loserId) {
        const loserNextFight = await fightRepository.findOneBy({
          id: fight.loserNextFightId,
        });

        if (loserNextFight) {
          if (fight.loserNextFightSlot === 'A') {
            loserNextFight.athleteAId = loserId;
          } else {
            loserNextFight.athleteBId = loserId;
          }

          if (
            fight.areaId !== null &&
            loserNextFight.areaId !== fight.areaId
          ) {
            loserNextFight.areaId = fight.areaId;
          }

          await fightRepository.save(loserNextFight);

          if (loserNextFight.areaId !== null) {
            await this.enqueueFightInArea({
              fightId: loserNextFight.id,
              areaId: loserNextFight.areaId,
              areaQueueRepository,
            });
          }
        }
      }

      await fightRepository.save(fight);

      const thirdBestOfThreeFight =
        nextFight === null
          ? await this.createThirdBestOfThreeFightIfNeeded({
              fight,
              fightRepository,
              areaQueueRepository,
            })
          : null;

      if (thirdBestOfThreeFight) {
        nextFight = thirdBestOfThreeFight;
      }

      if (fight.keyGroupId !== null) {
        champion = await this.persistKeyGroupChampion({
          keyGroupId: fight.keyGroupId,
          fallbackCategoryId: fight.categoryId,
          fightRepository,
          keyGroupRepository,
          categoryRepository,
        });
      } else if (fight.categoryId !== null) {
        champion = await this.persistCategoryChampion({
          categoryId: fight.categoryId,
          fightRepository,
          categoryRepository,
        });
      }

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
        vacatedAreaId,
      };
    });

    await this.eventBus.publish({
      name: 'fight.finished',
      payload: {
        fightId: result.fight.id,
        competitionId: input.competitionId,
        areaId: result.fight.areaId,
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

    if (result.vacatedAreaId !== null && result.nextFight) {
      await this.eventBus.publish({
        name: 'queue.updated',
        payload: {
          competitionId: input.competitionId,
          areaId: result.vacatedAreaId,
          fightId: result.nextFight.id,
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
            keyGroupId: result.nextFight.keyGroupId,
            round: result.nextFight.round,
            orderIndex: result.nextFight.order,
            athleteAId: result.nextFight.athleteAId,
            athleteBId: result.nextFight.athleteBId,
            status: result.nextFight.status,
            areaId: result.nextFight.areaId,
          }
        : null,
      categoryChampion: result.categoryChampion,
    };
  }

  /**
   * Categoria sem chave (modos por categoria): o campeao e o vencedor da luta
   * de maior rodada, e so quando todas as lutas da categoria terminaram — a
   * disputa de terceiro e a final da Serie Prata nao valem titulo.
   */
  private async persistCategoryChampion(input: {
    categoryId: number;
    fightRepository: import('typeorm').Repository<FightTypeOrmEntity>;
    categoryRepository: import('typeorm').Repository<CategoryTypeOrmEntity>;
  }): Promise<Output['categoryChampion']> {
    const categoryFights = await input.fightRepository.find({
      where: { categoryId: input.categoryId },
      order: { order: 'ASC', id: 'ASC' },
    });
    const championAthleteId = this.keyGroupChampionService.resolve(
      categoryFights.map(FightMapper.toDomain),
    );

    const category = await input.categoryRepository.findOneBy({
      id: input.categoryId,
    });

    if (!category || category.championAthleteId === championAthleteId) {
      return championAthleteId === null || !category
        ? null
        : { categoryId: category.id, athleteId: championAthleteId };
    }

    category.championAthleteId = championAthleteId;
    await input.categoryRepository.save(category);

    return championAthleteId === null
      ? null
      : { categoryId: category.id, athleteId: championAthleteId };
  }

  /**
   * O campeao da chave e gravado em key_groups; quando a chave tem categoria,
   * a categoria tambem recebe o campeao (usado pelo relatorio de academias).
   */
  private async persistKeyGroupChampion(input: {
    keyGroupId: number;
    fallbackCategoryId: number | null;
    fightRepository: import('typeorm').Repository<FightTypeOrmEntity>;
    keyGroupRepository: import('typeorm').Repository<KeyGroupTypeOrmEntity>;
    categoryRepository: import('typeorm').Repository<CategoryTypeOrmEntity>;
  }): Promise<Output['categoryChampion']> {
    const keyGroupFights = await input.fightRepository.find({
      where: { keyGroupId: input.keyGroupId },
      order: { order: 'ASC', id: 'ASC' },
    });
    const championAthleteId = this.keyGroupChampionService.resolve(
      keyGroupFights.map(FightMapper.toDomain),
    );

    const keyGroup = await input.keyGroupRepository.findOneBy({
      id: input.keyGroupId,
    });

    if (keyGroup && keyGroup.championAthleteId !== championAthleteId) {
      keyGroup.championAthleteId = championAthleteId;
      await input.keyGroupRepository.save(keyGroup);
    }

    const categoryId = keyGroup?.categoryId ?? input.fallbackCategoryId;

    if (championAthleteId === null || categoryId === null) {
      return null;
    }

    const category = await input.categoryRepository.findOneBy({
      id: categoryId,
    });

    if (!category) {
      return null;
    }

    category.championAthleteId = championAthleteId;
    await input.categoryRepository.save(category);

    return {
      categoryId: category.id,
      athleteId: championAthleteId,
    };
  }

  private async createThirdBestOfThreeFightIfNeeded(input: {
    fight: FightTypeOrmEntity;
    fightRepository: import('typeorm').Repository<FightTypeOrmEntity>;
    areaQueueRepository: import('typeorm').Repository<AreaQueueItemTypeOrmEntity>;
  }): Promise<FightTypeOrmEntity | null> {
    // O grupo do melhor de tres e a chave; nos modos por categoria (sem chave)
    // o grupo e a propria categoria.
    const groupWhere =
      input.fight.keyGroupId !== null
        ? { keyGroupId: input.fight.keyGroupId }
        : input.fight.categoryId !== null
          ? { categoryId: input.fight.categoryId }
          : null;

    if (groupWhere === null) {
      return null;
    }

    const keyGroupFights = await input.fightRepository.find({
      where: groupWhere,
      order: { order: 'ASC', id: 'ASC' },
    });

    const shouldCreateThirdFight =
      this.bestOfThreeProgressionService.shouldCreateThirdFight(
        keyGroupFights.map(FightMapper.toDomain),
      );

    if (!shouldCreateThirdFight) {
      return null;
    }

    const [firstFight] = keyGroupFights;
    const thirdFight = input.fightRepository.create({
      competitionId: input.fight.competitionId,
      categoryId: input.fight.categoryId,
      keyGroupId: input.fight.keyGroupId,
      round: 1,
      order: 3,
      areaId: input.fight.areaId,
      status: FightStatus.PENDING,
      athleteAId: firstFight.athleteAId,
      athleteBId: firstFight.athleteBId,
      winnerId: null,
      loserId: null,
      nextFightId: null,
      nextFightSlot: null,
      createdManually: false,
      isWo: false,
      winType: null,
      startedAt: null,
      finishedAt: null,
    });
    const savedThirdFight = await input.fightRepository.save(thirdFight);

    if (savedThirdFight.areaId !== null) {
      await this.enqueueFightInArea({
        fightId: savedThirdFight.id,
        areaId: savedThirdFight.areaId,
        areaQueueRepository: input.areaQueueRepository,
      });
    }

    return savedThirdFight;
  }

  private async enqueueFightInArea(input: {
    fightId: number;
    areaId: number;
    areaQueueRepository: import('typeorm').Repository<AreaQueueItemTypeOrmEntity>;
  }): Promise<void> {
    const queueItem = await input.areaQueueRepository.findOneBy({
      fightId: input.fightId,
    });

    if (
      queueItem &&
      queueItem.areaId === input.areaId &&
      queueItem.status !== AreaQueueItemStatus.DONE
    ) {
      return;
    }

    const [lastQueueItem] = await input.areaQueueRepository.find({
      where: { areaId: input.areaId },
      order: { position: 'DESC' },
      take: 1,
    });
    const position = (lastQueueItem?.position ?? 0) + 1;

    if (queueItem) {
      queueItem.areaId = input.areaId;
      queueItem.position = position;
      queueItem.status = AreaQueueItemStatus.QUEUED;
      await input.areaQueueRepository.save(queueItem);
      return;
    }

    await input.areaQueueRepository.save(
      input.areaQueueRepository.create({
        areaId: input.areaId,
        fightId: input.fightId,
        position,
        status: AreaQueueItemStatus.QUEUED,
      }),
    );
  }
}
