import { Body, Controller, Delete, Get, Param, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { ZodValidationPipe } from '@/core/pipe/zod-validation.pipe';
import { CompetitionIdParamDto, CompetitionIdParamSchema } from '@/domain/competition/infra/http/dtos/competition-id-param.dto';
import { ApiResponse } from '@/shared/result/api-response.type';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { CreateKeyGroupUseCase } from '../../application/use-cases/create-key-group.use-case';
import { AddMemberToKeyGroupUseCase } from '../../application/use-cases/add-member-to-key-group.use-case';
import { RemoveMemberFromKeyGroupUseCase } from '../../application/use-cases/remove-member-from-key-group.use-case';
import { ListKeyGroupsUseCase } from '../../application/use-cases/list-key-groups.use-case';
import { GetKeyGroupDetailsUseCase } from '../../application/use-cases/get-key-group-details.use-case';
import { GenerateFightsForKeyGroupUseCase } from '../../application/use-cases/generate-fights-for-key-group.use-case';
import { LockKeyGroupUseCase } from '../../application/use-cases/lock-key-group.use-case';
import { ExportCompetitionBracketsPdfUseCase } from '../../application/use-cases/export-competition-brackets-pdf.use-case';
import { UpdateKeyGroupUseCase } from '../../application/use-cases/update-key-group.use-case';
import { KeyGroupDetailsView, KeyGroupListItemView } from '../../repository/IKeyGroupRepository.repository';
import { CreateKeyGroupDto, CreateKeyGroupSchema } from './dtos/create-key-group.dto';
import { KeyGroupIdParamDto, KeyGroupIdParamSchema } from './dtos/key-group-id-param.dto';
import { KeyGroupMemberParamDto, KeyGroupMemberParamSchema } from './dtos/key-group-member-param.dto';
import { ListKeyGroupsDto, ListKeyGroupsSchema } from './dtos/list-key-groups.dto';
import { UpdateKeyGroupDto, UpdateKeyGroupSchema } from './dtos/update-key-group.dto';

type CreateKeyGroupResponse = {
  id: number;
  competitionId: number;
  categoryId: number | null;
  name: string | null;
  status: string;
  createdAt: Date;
  athletes: KeyGroupDetailsView['members'];
  fights: KeyGroupDetailsView['fights'];
};

@Controller()
export class KeyGroupController {
  constructor(
    private readonly createKeyGroupUseCase: CreateKeyGroupUseCase,
    private readonly addMemberToKeyGroupUseCase: AddMemberToKeyGroupUseCase,
    private readonly removeMemberFromKeyGroupUseCase: RemoveMemberFromKeyGroupUseCase,
    private readonly listKeyGroupsUseCase: ListKeyGroupsUseCase,
    private readonly getKeyGroupDetailsUseCase: GetKeyGroupDetailsUseCase,
    private readonly generateFightsForKeyGroupUseCase: GenerateFightsForKeyGroupUseCase,
    private readonly lockKeyGroupUseCase: LockKeyGroupUseCase,
    private readonly updateKeyGroupUseCase: UpdateKeyGroupUseCase,
    private readonly exportCompetitionBracketsPdfUseCase: ExportCompetitionBracketsPdfUseCase,
  ) {}

  @Post('competitions/:id/key-groups')
  async create(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Body(new ZodValidationPipe(CreateKeyGroupSchema))
    body: CreateKeyGroupDto,
  ): Promise<ApiResponse<CreateKeyGroupResponse>> {
    const group = await this.createKeyGroupUseCase.execute({
      competitionId: params.id,
      ...body,
    });

    return {
      data: {
        id: group.id,
        competitionId: group.competitionId,
        categoryId: group.categoryId,
        name: group.name,
        status: group.status,
        createdAt: group.createdAt,
        athletes: group.members,
        fights: group.fights,
      },
      error: null,
    };
  }

  @Get('competitions/:id/key-groups')
  async list(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Query(new ZodValidationPipe(ListKeyGroupsSchema))
    query: ListKeyGroupsDto,
  ): Promise<ApiResponse<KeyGroupListItemView[]>> {
    const groups = await this.listKeyGroupsUseCase.execute({
      competitionId: params.id,
      categoryId: query.categoryId,
    });

    return {
      data: groups,
      error: null,
    };
  }

  @Get('key-groups/:id')
  async getDetails(
    @Param(new ZodValidationPipe(KeyGroupIdParamSchema))
    params: KeyGroupIdParamDto,
  ): Promise<ApiResponse<KeyGroupDetailsView>> {
    const details = await this.getKeyGroupDetailsUseCase.execute(params.id);

    return {
      data: details,
      error: null,
    };
  }

  @Patch('key-groups/:id')
  async update(
    @Param(new ZodValidationPipe(KeyGroupIdParamSchema))
    params: KeyGroupIdParamDto,
    @Body(new ZodValidationPipe(UpdateKeyGroupSchema))
    body: UpdateKeyGroupDto,
  ): Promise<ApiResponse<ReturnType<KeyGroup['toJSON']>>> {
    const group = await this.updateKeyGroupUseCase.execute({
      id: params.id,
      ...body,
    });

    return {
      data: group.toJSON(),
      error: null,
    };
  }

  @Post('key-groups/:id/members/:athleteId')
  async addMember(
    @Param(new ZodValidationPipe(KeyGroupMemberParamSchema))
    params: KeyGroupMemberParamDto,
  ) {
    const member = await this.addMemberToKeyGroupUseCase.execute({
      keyGroupId: params.id,
      athleteId: params.athleteId,
    });

    return {
      data: member.toJSON(),
      error: null,
    };
  }

  @Delete('key-groups/:id/members/:athleteId')
  async removeMember(
    @Param(new ZodValidationPipe(KeyGroupMemberParamSchema))
    params: KeyGroupMemberParamDto,
  ) {
    await this.removeMemberFromKeyGroupUseCase.execute({
      keyGroupId: params.id,
      athleteId: params.athleteId,
    });

    return {
      data: true,
      error: null,
    };
  }

  @Post('key-groups/:id/generate-fights')
  async generateFights(
    @Param(new ZodValidationPipe(KeyGroupIdParamSchema))
    params: KeyGroupIdParamDto,
  ) {
    const result = await this.generateFightsForKeyGroupUseCase.execute(params.id);

    return {
      data: result,
      error: null,
    };
  }

  @Post('key-groups/:id/lock')
  async lock(
    @Param(new ZodValidationPipe(KeyGroupIdParamSchema))
    params: KeyGroupIdParamDto,
  ) {
    const group = await this.lockKeyGroupUseCase.execute(params.id);

    return {
      data: group.toJSON(),
      error: null,
    };
  }

  @Get('competitions/:id/brackets/pdf')
  async exportPdf(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
  ) {
    const pdf = await this.exportCompetitionBracketsPdfUseCase.execute(params.id);

    return new StreamableFile(pdf.buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${pdf.fileName}"`,
    });
  }
}
