import { KeyGroup } from '../../../src/domain/key-group/domain/entities/key-group.entity';
import { KeyGroupMember } from '../../../src/domain/key-group/domain/entities/key-group-member.entity';
import {
  IKeyGroupRepository,
  KeyGroupDetailsView,
  KeyGroupListItemView,
  KeyGroupReportView,
} from '../../../src/domain/key-group/repository/IKeyGroupRepository.repository';

export class InMemoryKeyGroupRepository implements IKeyGroupRepository {
  private groups: KeyGroup[] = [];
  private members: KeyGroupMember[] = [];
  private nextGroupId = 1;
  private nextMemberId = 1;
  private detailsById = new Map<number, KeyGroupDetailsView>();
  private reportViews: KeyGroupReportView[] = [];

  constructor(seedGroups: KeyGroup[] = [], seedMembers: KeyGroupMember[] = []) {
    this.setGroups(seedGroups);
    this.setMembers(seedMembers);
  }

  setReportViews(views: KeyGroupReportView[]) {
    this.reportViews = [...views];
  }

  setGroups(groups: KeyGroup[]) {
    this.groups = [...groups];
    this.nextGroupId =
      groups.reduce((max, group) => Math.max(max, group.id ?? 0), 0) + 1;
  }

  setMembers(members: KeyGroupMember[]) {
    this.members = [...members];
    this.nextMemberId =
      members.reduce((max, member) => Math.max(max, member.id ?? 0), 0) + 1;
  }

  setDetails(id: number, details: KeyGroupDetailsView) {
    this.detailsById.set(id, details);
  }

  async create(group: KeyGroup): Promise<KeyGroup> {
    const saved = KeyGroup.restore({ ...group.toJSON(), id: this.nextGroupId++ });
    this.groups.push(saved);
    return saved;
  }

  async update(group: KeyGroup): Promise<KeyGroup> {
    this.groups = this.groups.map((current) =>
      current.id === group.id ? group : current,
    );
    return group;
  }

  async findById(id: number): Promise<KeyGroup | null> {
    return this.groups.find((group) => group.id === id) ?? null;
  }

  async listByCompetitionId(input: {
    competitionId: number;
    categoryId?: number;
  }): Promise<KeyGroupListItemView[]> {
    return this.groups
      .filter((group) => group.competitionId === input.competitionId)
      .filter((group) =>
        input.categoryId !== undefined
          ? group.categoryId === input.categoryId
          : true,
      )
      .map((group) => ({
        id: group.id as number,
        competitionId: group.competitionId,
        categoryId: group.categoryId,
        name: group.name,
        status: group.status,
        createdAt: group.createdAt,
        membersCount: this.members.filter(
          (member) => member.keyGroupId === group.id,
        ).length,
      }));
  }

  async getDetails(id: number): Promise<KeyGroupDetailsView | null> {
    if (this.detailsById.has(id)) {
      return this.detailsById.get(id) as KeyGroupDetailsView;
    }

    const group = this.groups.find((current) => current.id === id);
    if (!group) {
      return null;
    }

    return {
      id: group.id as number,
      competitionId: group.competitionId,
      categoryId: group.categoryId,
      name: group.name,
      status: group.status,
      createdAt: group.createdAt,
      members: this.members
        .filter((member) => member.keyGroupId === id)
        .map((member) => ({
          id: member.athleteId,
          fullName: `Athlete ${member.athleteId}`,
          birthDate: new Date('2010-01-01T00:00:00.000Z'),
          belt: 'white',
          declaredWeightGrams: 0,
          academyName: null,
          weighInStatus: 'PENDING' as never,
        })),
      fights: [],
    };
  }

  async listReportByCompetitionId(input: {
    competitionId: number;
    categoryId?: number;
    areaId?: number;
  }): Promise<KeyGroupReportView[]> {
    return this.reportViews.filter(
      (view) => view.competitionId === input.competitionId,
    );
  }

  async listMembersByKeyGroupId(keyGroupId: number): Promise<KeyGroupMember[]> {
    return this.members.filter((member) => member.keyGroupId === keyGroupId);
  }

  async findByCompetitionIdAndAthleteId(
    competitionId: number,
    athleteId: number,
  ): Promise<KeyGroup | null> {
    const membership = this.members.find(
      (member) => member.athleteId === athleteId,
    );
    if (!membership) {
      return null;
    }

    return (
      this.groups.find(
        (group) =>
          group.id === membership.keyGroupId &&
          group.competitionId === competitionId,
      ) ?? null
    );
  }

  async addMember(keyGroupId: number, athleteId: number): Promise<KeyGroupMember> {
    const member = KeyGroupMember.restore({
      id: this.nextMemberId++,
      keyGroupId,
      athleteId,
      createdAt: new Date(),
    });
    this.members.push(member);
    return member;
  }

  async removeMember(keyGroupId: number, athleteId: number): Promise<void> {
    this.members = this.members.filter(
      (member) =>
        !(member.keyGroupId === keyGroupId && member.athleteId === athleteId),
    );
  }
}
