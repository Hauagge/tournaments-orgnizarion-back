import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { KeyGroup } from '../domain/entities/key-group.entity';
import { KeyGroupMember } from '../domain/entities/key-group-member.entity';

export type KeyGroupListItemView = {
  id: number;
  competitionId: number;
  categoryId: number | null;
  name: string | null;
  status: string;
  createdAt: Date;
  membersCount: number;
};

export type KeyGroupDetailsAthleteView = {
  id: number;
  fullName: string;
  birthDate: Date;
  belt: string;
  declaredWeightGrams: number;
  academyName: string | null;
  weighInStatus: WeighInStatus;
};

export type KeyGroupDetailsFightView = {
  id: number;
  keyGroupId: number | null;
  athleteAId: number;
  athleteAName: string | null;
  athleteABirthDate: Date | null;
  athleteBId: number;
  athleteBName: string | null;
  athleteBBirthDate: Date | null;
  status: FightStatus;
  winnerAthleteId: number | null;
  winType: string | null;
  orderIndex: number;
};

export type KeyGroupDetailsView = {
  id: number;
  competitionId: number;
  categoryId: number | null;
  name: string | null;
  status: string;
  createdAt: Date;
  members: KeyGroupDetailsAthleteView[];
  fights: KeyGroupDetailsFightView[];
};

export abstract class IKeyGroupRepository {
  abstract create(group: KeyGroup): Promise<KeyGroup>;
  abstract update(group: KeyGroup): Promise<KeyGroup>;
  abstract findById(id: number): Promise<KeyGroup | null>;
  abstract listByCompetitionId(input: {
    competitionId: number;
    categoryId?: number;
  }): Promise<KeyGroupListItemView[]>;
  abstract getDetails(id: number): Promise<KeyGroupDetailsView | null>;
  abstract listMembersByKeyGroupId(keyGroupId: number): Promise<KeyGroupMember[]>;
  abstract findByCompetitionIdAndAthleteId(
    competitionId: number,
    athleteId: number,
  ): Promise<KeyGroup | null>;
  abstract addMember(keyGroupId: number, athleteId: number): Promise<KeyGroupMember>;
  abstract removeMember(keyGroupId: number, athleteId: number): Promise<void>;
}
