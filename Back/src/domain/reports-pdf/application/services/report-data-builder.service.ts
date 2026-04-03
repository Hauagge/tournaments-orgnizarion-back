import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import {
  IKeyGroupRepository,
  KeyGroupReportFightView,
  KeyGroupReportView,
} from '@/domain/key-group/repository/IKeyGroupRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import {
  BracketReportAthleteDto,
  BracketReportDto,
  BracketsReportView,
  BracketStageLineDto,
  FightLineDto,
} from '../dtos/bracket-report.dto';

type BuildReportInput = {
  competitionId: number;
  categoryId?: number;
  areaId?: number;
  includeResults: boolean;
};

@Injectable()
export class ReportDataBuilderService {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
  ) {}

  async build(input: BuildReportInput): Promise<BracketsReportView> {
    const competition = await this.competitionRepository.findById(input.competitionId);

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const groups = await this.keyGroupRepository.listReportByCompetitionId({
      competitionId: input.competitionId,
      categoryId: input.categoryId,
      areaId: input.areaId,
    });

    return {
      competitionName: competition.name,
      competitionMode: competition.mode,
      exportedAt: new Date().toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      includeResults: input.includeResults,
      brackets: groups.map((group) => this.mapBracket(group, input.includeResults)),
    };
  }

  private mapBracket(
    group: KeyGroupReportView,
    includeResults: boolean,
  ): BracketReportDto {
    const athletes: BracketReportAthleteDto[] = group.members.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      birthDate: member.birthDate.toLocaleDateString('pt-BR'),
      belt: member.belt,
      academyName: member.academyName,
    }));

    const fights = group.fights
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex || left.id - right.id)
      .map((fight, index) =>
        this.mapFightLine({
          fight,
          round: this.resolveRoundLabel(group.members.length, index),
          fightNumber: index + 1,
          includeResults,
        }),
      );

    return {
      categoryName: group.categoryName ?? 'Sem categoria',
      bracketName: group.name ?? `Chave ${group.id}`,
      athletes,
      fights,
      stage: this.buildStage(group, includeResults),
    };
  }

  private resolveRoundLabel(size: number, index: number): string {
    if (size <= 2) {
      return 'FINAL';
    }

    if (size === 3) {
      return index === 0 ? 'SEMI' : 'FINAL';
    }

    return index < 2 ? `SEMI ${index + 1}` : 'FINAL';
  }

  private buildStage(
    group: KeyGroupReportView,
    includeResults: boolean,
  ): BracketReportDto['stage'] {
    const members = group.members;
    const fights = group.fights
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex || left.id - right.id);

    if (members.length <= 2) {
      return {
        size: members.length,
        semiFinals: [],
        final: this.createStageLine({
          label: 'FINAL',
          athleteA: members[0]?.fullName ?? '',
          athleteB: members[1]?.fullName ?? '',
          fight: fights[0],
          includeResults,
          isPlaceholder: fights.length === 0,
        }),
      };
    }

    if (members.length === 3) {
      return {
        size: 3,
        semiFinals: [
          this.createStageLine({
            label: 'SEMI',
            athleteA: members[1]?.fullName ?? '',
            athleteB: members[2]?.fullName ?? '',
            fight: fights[0],
            includeResults,
            isPlaceholder: fights.length === 0,
          }),
        ],
        final: {
          label: 'FINAL',
          athleteA: members[0]?.fullName ?? '',
          athleteB: 'Vencedor da semi',
          areaName: null,
          winner: null,
          winType: null,
          isPlaceholder: true,
        },
      };
    }

    return {
      size: members.length,
      semiFinals: [
        this.createStageLine({
          label: 'SEMI 1',
          athleteA: members[0]?.fullName ?? '',
          athleteB: members[1]?.fullName ?? '',
          fight: fights[0],
          includeResults,
          isPlaceholder: fights.length === 0,
        }),
        this.createStageLine({
          label: 'SEMI 2',
          athleteA: members[2]?.fullName ?? '',
          athleteB: members[3]?.fullName ?? '',
          fight: fights[1],
          includeResults,
          isPlaceholder: fights.length < 2,
        }),
      ],
      final: {
        label: 'FINAL',
        athleteA: 'Vencedor da semi 1',
        athleteB: 'Vencedor da semi 2',
        areaName: null,
        winner: null,
        winType: null,
        isPlaceholder: true,
      },
    };
  }

  private mapFightLine(input: {
    fight: KeyGroupReportFightView;
    round: string;
    fightNumber: number;
    includeResults: boolean;
  }): FightLineDto {
    const winner = input.includeResults
      ? this.resolveWinnerName(input.fight)
      : null;

    return {
      round: input.round,
      fightNumber: input.fightNumber,
      athleteA: input.fight.athleteAName ?? `Atleta ${input.fight.athleteAId}`,
      academyA: input.fight.academyAName,
      athleteB: input.fight.athleteBName ?? `Atleta ${input.fight.athleteBId}`,
      academyB: input.fight.academyBName,
      areaName: input.fight.areaName,
      winner: winner ?? undefined,
      winType:
        input.includeResults && input.fight.winType
          ? input.fight.winType
          : undefined,
    };
  }

  private createStageLine(input: {
    label: string;
    athleteA: string;
    athleteB: string;
    fight?: KeyGroupReportFightView;
    includeResults: boolean;
    isPlaceholder: boolean;
  }): BracketStageLineDto {
    if (!input.fight) {
      return {
        label: input.label,
        athleteA: input.athleteA,
        athleteB: input.athleteB,
        areaName: null,
        winner: null,
        winType: null,
        isPlaceholder: true,
      };
    }

    return {
      label: input.label,
      athleteA: input.fight.athleteAName ?? input.athleteA,
      athleteB: input.fight.athleteBName ?? input.athleteB,
      areaName: input.fight.areaName,
      winner: input.includeResults ? this.resolveWinnerName(input.fight) : null,
      winType: input.includeResults ? input.fight.winType : null,
      isPlaceholder: input.isPlaceholder,
    };
  }

  private resolveWinnerName(fight: KeyGroupReportFightView): string | null {
    if (!fight.winnerAthleteId) {
      return null;
    }

    if (fight.winnerAthleteId === fight.athleteAId) {
      return fight.athleteAName ?? `Atleta ${fight.athleteAId}`;
    }

    if (fight.winnerAthleteId === fight.athleteBId) {
      return fight.athleteBName ?? `Atleta ${fight.athleteBId}`;
    }

    return null;
  }
}
