import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { AreaTypeOrmEntity } from '@/domain/area/infra/persistence/entities/area.typeorm-entity';
import { FightTypeOrmEntity } from '@/domain/fight/entities/fight.typeorm-entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { WeighInTypeOrmEntity } from '@/domain/weighin/infra/persistence/entities/weigh-in.typeorm-entity';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { AthleteTypeOrmEntity } from '@/domain/athlete/infra/persistence/entities/athlete.typeorm-entity';
import { AcademyTypeOrmEntity } from '@/domain/academy/infra/persistence/entities/academy.typeorm-entity';
import { CategoryTypeOrmEntity } from '@/domain/category/infra/persistence/entities/category.typeorm-entity';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { KeyGroupMember } from '../../domain/entities/key-group-member.entity';
import {
  IKeyGroupRepository,
  KeyGroupDetailsAthleteView,
  KeyGroupDetailsFightView,
  KeyGroupDetailsView,
  KeyGroupListItemView,
  KeyGroupReportAthleteView,
  KeyGroupReportFightView,
  KeyGroupReportView,
} from '../../repository/IKeyGroupRepository.repository';
import { KeyGroupMapper } from './key-group.mapper';
import { KeyGroupMemberTypeOrmEntity } from './entities/key-group-member.typeorm-entity';
import { KeyGroupTypeOrmEntity } from './entities/key-group.typeorm-entity';

@Injectable()
export class KeyGroupRepository implements IKeyGroupRepository {
  constructor(
    @InjectRepository(KeyGroupTypeOrmEntity)
    private readonly keyGroupRepository: Repository<KeyGroupTypeOrmEntity>,
    @InjectRepository(KeyGroupMemberTypeOrmEntity)
    private readonly keyGroupMemberRepository: Repository<KeyGroupMemberTypeOrmEntity>,
    @InjectRepository(FightTypeOrmEntity)
    private readonly fightRepository: Repository<FightTypeOrmEntity>,
  ) {}

  async create(group: KeyGroup): Promise<KeyGroup> {
    const entity = this.keyGroupRepository.create(KeyGroupMapper.toPersistence(group));
    const saved = await this.keyGroupRepository.save(entity);
    return KeyGroupMapper.toDomain(saved);
  }

  async update(group: KeyGroup): Promise<KeyGroup> {
    const result = await this.keyGroupRepository.update(
      { id: group.id as number },
      KeyGroupMapper.toPersistence(group),
    );

    if (!result.affected) {
      throw new NotFoundError(`Key group with id ${group.id as number} not found`);
    }

    return group;
  }

  async findById(id: number): Promise<KeyGroup | null> {
    const entity = await this.keyGroupRepository.findOneBy({ id });
    return entity ? KeyGroupMapper.toDomain(entity) : null;
  }

  async listByCompetitionId(input: {
    competitionId: number;
    categoryId?: number;
  }): Promise<KeyGroupListItemView[]> {
    const query = this.keyGroupRepository
      .createQueryBuilder('keyGroup')
      .leftJoin(
        KeyGroupMemberTypeOrmEntity,
        'member',
        'member.key_group_id = keyGroup.id',
      )
      .where('keyGroup.competition_id = :competitionId', {
        competitionId: input.competitionId,
      });

    if (input.categoryId !== undefined) {
      query.andWhere('keyGroup.category_id = :categoryId', {
        categoryId: input.categoryId,
      });
    }

    const rows = await query
      .select('keyGroup.id', 'id')
      .addSelect('keyGroup.competition_id', 'competitionId')
      .addSelect('keyGroup.category_id', 'categoryId')
      .addSelect('keyGroup.name', 'name')
      .addSelect('keyGroup.status', 'status')
      .addSelect('keyGroup.created_at', 'createdAt')
      .addSelect('COUNT(member.id)', 'membersCount')
      .groupBy('keyGroup.id')
      .orderBy('keyGroup.category_id', 'ASC')
      .addOrderBy('keyGroup.created_at', 'ASC')
      .getRawMany<{
        id: string;
        competitionId: string;
        categoryId: string | null;
        name: string | null;
        status: string;
        createdAt: Date;
        membersCount: string;
      }>();

    return rows.map((row) => ({
      id: Number(row.id),
      competitionId: Number(row.competitionId),
      categoryId: row.categoryId === null ? null : Number(row.categoryId),
      name: row.name,
      status: row.status,
      createdAt: new Date(row.createdAt),
      membersCount: Number(row.membersCount),
    }));
  }

  async getDetails(id: number): Promise<KeyGroupDetailsView | null> {
    const group = await this.findById(id);

    if (!group) {
      return null;
    }

    const [memberRows, fightRows] = await Promise.all([
      this.keyGroupMemberRepository
        .createQueryBuilder('member')
        .innerJoin(
          AthleteTypeOrmEntity,
          'athlete',
          'athlete.id = member.athlete_id',
        )
        .leftJoin(
          AcademyTypeOrmEntity,
          'academy',
          'academy.id = athlete.academy_id',
        )
        .leftJoin(
          WeighInTypeOrmEntity,
          'weighIn',
          [
            'weighIn.athlete_id = athlete.id',
            'weighIn.competition_id = athlete.competition_id',
          ].join(' AND '),
        )
        .where('member.key_group_id = :id', { id })
        .select('athlete.id', 'id')
        .addSelect('athlete.full_name', 'fullName')
        .addSelect('athlete.birth_date', 'birthDate')
        .addSelect('athlete.belt', 'belt')
        .addSelect('athlete.declared_weight_grams', 'declaredWeightGrams')
        .addSelect('academy.name', 'academyName')
        .addSelect('COALESCE(weighIn.status, :pendingStatus)', 'weighInStatus')
        .setParameter('pendingStatus', WeighInStatus.PENDING)
        .orderBy('member.created_at', 'ASC')
        .getRawMany<{
          id: string;
          fullName: string;
          birthDate: Date;
          belt: string;
          declaredWeightGrams: string;
          academyName: string | null;
          weighInStatus: WeighInStatus;
        }>(),
      this.fightRepository
        .createQueryBuilder('fight')
        .leftJoin(
          AthleteTypeOrmEntity,
          'athleteA',
          'athleteA.id = fight.athlete_a_id',
        )
        .leftJoin(
          AthleteTypeOrmEntity,
          'athleteB',
          'athleteB.id = fight.athlete_b_id',
        )
        .where('fight.key_group_id = :id', { id })
        .select('fight.id', 'id')
        .addSelect('fight.key_group_id', 'keyGroupId')
        .addSelect('fight.athlete_a_id', 'athleteAId')
        .addSelect('athleteA.full_name', 'athleteAName')
        .addSelect('athleteA.birth_date', 'athleteABirthDate')
        .addSelect('fight.athlete_b_id', 'athleteBId')
        .addSelect('athleteB.full_name', 'athleteBName')
        .addSelect('athleteB.birth_date', 'athleteBBirthDate')
        .addSelect('fight.status', 'status')
        .addSelect('fight.winner_athlete_id', 'winnerAthleteId')
        .addSelect('fight.win_type', 'winType')
        .addSelect('fight.order_index', 'orderIndex')
        .orderBy('fight.order_index', 'ASC')
        .addOrderBy('fight.id', 'ASC')
        .getRawMany<{
          id: string;
          keyGroupId: string | null;
          athleteAId: string;
          athleteAName: string | null;
          athleteABirthDate: Date | null;
          athleteBId: string;
          athleteBName: string | null;
          athleteBBirthDate: Date | null;
          status: FightStatus;
          winnerAthleteId: string | null;
          winType: string | null;
          orderIndex: string;
        }>(),
    ]);

    const members: KeyGroupDetailsAthleteView[] = memberRows.map((row) => ({
      id: Number(row.id),
      fullName: row.fullName,
      birthDate: new Date(row.birthDate),
      belt: row.belt,
      declaredWeightGrams: Number(row.declaredWeightGrams),
      academyName: row.academyName,
      weighInStatus: row.weighInStatus,
    }));

    const fights: KeyGroupDetailsFightView[] = fightRows.map((row) => ({
      id: Number(row.id),
      keyGroupId: row.keyGroupId === null ? null : Number(row.keyGroupId),
      athleteAId: Number(row.athleteAId),
      athleteAName: row.athleteAName,
      athleteABirthDate:
        row.athleteABirthDate === null ? null : new Date(row.athleteABirthDate),
      athleteBId: Number(row.athleteBId),
      athleteBName: row.athleteBName,
      athleteBBirthDate:
        row.athleteBBirthDate === null ? null : new Date(row.athleteBBirthDate),
      status: row.status,
      winnerAthleteId:
        row.winnerAthleteId === null ? null : Number(row.winnerAthleteId),
      winType: row.winType,
      orderIndex: Number(row.orderIndex),
    }));

    return {
      id: group.id as number,
      competitionId: group.competitionId,
      categoryId: group.categoryId,
      name: group.name,
      status: group.status,
      createdAt: group.createdAt,
      members,
      fights,
    };
  }

  async listReportByCompetitionId(input: {
    competitionId: number;
    categoryId?: number;
    areaId?: number;
  }): Promise<KeyGroupReportView[]> {
    const groupsQuery = this.keyGroupRepository
      .createQueryBuilder('keyGroup')
      .leftJoin(
        CategoryTypeOrmEntity,
        'category',
        'category.id = keyGroup.category_id',
      )
      .where('keyGroup.competition_id = :competitionId', {
        competitionId: input.competitionId,
      });

    if (input.categoryId !== undefined) {
      groupsQuery.andWhere('keyGroup.category_id = :categoryId', {
        categoryId: input.categoryId,
      });
    }

    if (input.areaId !== undefined) {
      groupsQuery
        .innerJoin(
          FightTypeOrmEntity,
          'fightFilter',
          [
            'fightFilter.key_group_id = keyGroup.id',
            'fightFilter.area_id = :areaId',
          ].join(' AND '),
        )
        .setParameter('areaId', input.areaId);
    }

    const groupRows = await groupsQuery
      .select('keyGroup.id', 'id')
      .addSelect('keyGroup.competition_id', 'competitionId')
      .addSelect('keyGroup.category_id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('keyGroup.name', 'name')
      .addSelect('keyGroup.status', 'status')
      .addSelect('keyGroup.created_at', 'createdAt')
      .distinct(true)
      .orderBy('category.name', 'ASC', 'NULLS LAST')
      .addOrderBy('keyGroup.created_at', 'ASC')
      .addOrderBy('keyGroup.id', 'ASC')
      .getRawMany<{
        id: string;
        competitionId: string;
        categoryId: string | null;
        categoryName: string | null;
        name: string | null;
        status: string;
        createdAt: Date;
      }>();

    if (groupRows.length === 0) {
      return [];
    }

    const groupIds = groupRows.map((row) => Number(row.id));

    const [memberRows, fightRows] = await Promise.all([
      this.keyGroupMemberRepository
        .createQueryBuilder('member')
        .innerJoin(
          AthleteTypeOrmEntity,
          'athlete',
          'athlete.id = member.athlete_id',
        )
        .leftJoin(
          AcademyTypeOrmEntity,
          'academy',
          'academy.id = athlete.academy_id',
        )
        .where('member.key_group_id IN (:...groupIds)', { groupIds })
        .select('member.key_group_id', 'keyGroupId')
        .addSelect('athlete.id', 'id')
        .addSelect('athlete.full_name', 'fullName')
        .addSelect('athlete.birth_date', 'birthDate')
        .addSelect('athlete.belt', 'belt')
        .addSelect('academy.name', 'academyName')
        .orderBy('member.key_group_id', 'ASC')
        .addOrderBy('member.created_at', 'ASC')
        .addOrderBy('member.id', 'ASC')
        .getRawMany<{
          keyGroupId: string;
          id: string;
          fullName: string;
          birthDate: Date;
          belt: string;
          academyName: string | null;
        }>(),
      this.fightRepository
        .createQueryBuilder('fight')
        .leftJoin(
          AthleteTypeOrmEntity,
          'athleteA',
          'athleteA.id = fight.athlete_a_id',
        )
        .leftJoin(
          AthleteTypeOrmEntity,
          'athleteB',
          'athleteB.id = fight.athlete_b_id',
        )
        .leftJoin(
          AcademyTypeOrmEntity,
          'academyA',
          'academyA.id = athleteA.academy_id',
        )
        .leftJoin(
          AcademyTypeOrmEntity,
          'academyB',
          'academyB.id = athleteB.academy_id',
        )
        .leftJoin(
          AreaTypeOrmEntity,
          'area',
          'area.id = fight.area_id',
        )
        .where('fight.key_group_id IN (:...groupIds)', { groupIds })
        .andWhere(
          input.areaId === undefined
            ? '1 = 1'
            : 'fight.area_id = :fightAreaId',
          input.areaId === undefined ? {} : { fightAreaId: input.areaId },
        )
        .select('fight.id', 'id')
        .addSelect('fight.key_group_id', 'keyGroupId')
        .addSelect('fight.area_id', 'areaId')
        .addSelect('area.name', 'areaName')
        .addSelect('fight.athlete_a_id', 'athleteAId')
        .addSelect('athleteA.full_name', 'athleteAName')
        .addSelect('academyA.name', 'academyAName')
        .addSelect('fight.athlete_b_id', 'athleteBId')
        .addSelect('athleteB.full_name', 'athleteBName')
        .addSelect('academyB.name', 'academyBName')
        .addSelect('fight.status', 'status')
        .addSelect('fight.winner_athlete_id', 'winnerAthleteId')
        .addSelect('fight.win_type', 'winType')
        .addSelect('fight.order_index', 'orderIndex')
        .orderBy('fight.key_group_id', 'ASC')
        .addOrderBy('fight.order_index', 'ASC')
        .addOrderBy('fight.id', 'ASC')
        .getRawMany<{
          id: string;
          keyGroupId: string;
          areaId: string | null;
          areaName: string | null;
          athleteAId: string;
          athleteAName: string | null;
          academyAName: string | null;
          athleteBId: string;
          athleteBName: string | null;
          academyBName: string | null;
          status: FightStatus;
          winnerAthleteId: string | null;
          winType: string | null;
          orderIndex: string;
        }>(),
    ]);

    const membersByGroupId = new Map<number, KeyGroupReportAthleteView[]>();
    for (const row of memberRows) {
      const keyGroupId = Number(row.keyGroupId);
      const current = membersByGroupId.get(keyGroupId) ?? [];
      current.push({
        id: Number(row.id),
        fullName: row.fullName,
        birthDate: new Date(row.birthDate),
        belt: row.belt,
        academyName: row.academyName,
      });
      membersByGroupId.set(keyGroupId, current);
    }

    const fightsByGroupId = new Map<number, KeyGroupReportFightView[]>();
    for (const row of fightRows) {
      const keyGroupId = Number(row.keyGroupId);
      const current = fightsByGroupId.get(keyGroupId) ?? [];
      current.push({
        id: Number(row.id),
        keyGroupId,
        areaId: row.areaId === null ? null : Number(row.areaId),
        areaName: row.areaName,
        athleteAId: Number(row.athleteAId),
        athleteAName: row.athleteAName,
        academyAName: row.academyAName,
        athleteBId: Number(row.athleteBId),
        athleteBName: row.athleteBName,
        academyBName: row.academyBName,
        status: row.status,
        winnerAthleteId:
          row.winnerAthleteId === null ? null : Number(row.winnerAthleteId),
        winType: row.winType,
        orderIndex: Number(row.orderIndex),
      });
      fightsByGroupId.set(keyGroupId, current);
    }

    return groupRows.map((row) => {
      const id = Number(row.id);

      return {
        id,
        competitionId: Number(row.competitionId),
        categoryId: row.categoryId === null ? null : Number(row.categoryId),
        categoryName: row.categoryName,
        name: row.name,
        status: row.status,
        createdAt: new Date(row.createdAt),
        members: membersByGroupId.get(id) ?? [],
        fights: fightsByGroupId.get(id) ?? [],
      };
    });
  }

  async listMembersByKeyGroupId(keyGroupId: number): Promise<KeyGroupMember[]> {
    const entities = await this.keyGroupMemberRepository.find({
      where: { keyGroupId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    return entities.map(KeyGroupMapper.memberToDomain);
  }

  async findByCompetitionIdAndAthleteId(
    competitionId: number,
    athleteId: number,
  ): Promise<KeyGroup | null> {
    const entity = await this.keyGroupRepository
      .createQueryBuilder('keyGroup')
      .innerJoin(
        KeyGroupMemberTypeOrmEntity,
        'member',
        'member.key_group_id = keyGroup.id',
      )
      .where('keyGroup.competition_id = :competitionId', { competitionId })
      .andWhere('member.athlete_id = :athleteId', { athleteId })
      .getOne();

    return entity ? KeyGroupMapper.toDomain(entity) : null;
  }

  async addMember(keyGroupId: number, athleteId: number): Promise<KeyGroupMember> {
    const entity = this.keyGroupMemberRepository.create({ keyGroupId, athleteId });
    const saved = await this.keyGroupMemberRepository.save(entity);
    return KeyGroupMapper.memberToDomain(saved);
  }

  async removeMember(keyGroupId: number, athleteId: number): Promise<void> {
    await this.keyGroupMemberRepository.delete({ keyGroupId, athleteId });
  }
}
