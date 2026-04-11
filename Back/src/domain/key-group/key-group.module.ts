import { Module } from '@nestjs/common';
import { AcademyProviderModule } from '../academy/academy-provider.module';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { CategoryProviderModule } from '../category/category-provider.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { AreaProviderModule } from '../area/area-provider.module';
import { FightGenerationStrategyModule } from '../fight/fight-generation-strategy.module';
import { FightProviderModule } from '../fight/fight-provider.module';
import { WeighInProviderModule } from '../weighin/weighin-provider.module';
import { AddMemberToKeyGroupUseCase } from './application/use-cases/add-member-to-key-group.use-case';
import { CreateKeyGroupUseCase } from './application/use-cases/create-key-group.use-case';
import { ExportCompetitionBracketsPdfUseCase } from './application/use-cases/export-competition-brackets-pdf.use-case';
import { GenerateFightsForKeyGroupUseCase } from './application/use-cases/generate-fights-for-key-group.use-case';
import { GetKeyGroupDetailsUseCase } from './application/use-cases/get-key-group-details.use-case';
import { ListKeyGroupsUseCase } from './application/use-cases/list-key-groups.use-case';
import { LockKeyGroupUseCase } from './application/use-cases/lock-key-group.use-case';
import { RemoveMemberFromKeyGroupUseCase } from './application/use-cases/remove-member-from-key-group.use-case';
import { UpdateKeyGroupUseCase } from './application/use-cases/update-key-group.use-case';
import { AbsoluteGpPdfRendererStrategy } from './application/strategies/absolute-gp-pdf-renderer.strategy';
import { KeysPdfRendererStrategy } from './application/strategies/keys-pdf-renderer.strategy';
import { PdfRendererResolverService } from './application/services/pdf-renderer-resolver.service';
import { KeyGroupAreaSelectionService } from './application/services/key-group-area-selection.service';
import { SimplePdfBuilderService } from './application/services/simple-pdf-builder.service';
import { KeyGroupController } from './infra/http/key-group.controller';
import { KeyGroupProviderModule } from './key-group-provider.module';

@Module({
  imports: [
    KeyGroupProviderModule,
    CompetitionProviderModule,
    CategoryProviderModule,
    AreaProviderModule,
    AthleteProviderModule,
    AcademyProviderModule,
    WeighInProviderModule,
    FightProviderModule,
    FightGenerationStrategyModule,
  ],
  controllers: [KeyGroupController],
  providers: [
    CreateKeyGroupUseCase,
    AddMemberToKeyGroupUseCase,
    RemoveMemberFromKeyGroupUseCase,
    ListKeyGroupsUseCase,
    GetKeyGroupDetailsUseCase,
    UpdateKeyGroupUseCase,
    GenerateFightsForKeyGroupUseCase,
    LockKeyGroupUseCase,
    ExportCompetitionBracketsPdfUseCase,
    KeysPdfRendererStrategy,
    AbsoluteGpPdfRendererStrategy,
    PdfRendererResolverService,
    KeyGroupAreaSelectionService,
    SimplePdfBuilderService,
  ],
  exports: [
    CreateKeyGroupUseCase,
    ListKeyGroupsUseCase,
    GetKeyGroupDetailsUseCase,
    KeyGroupProviderModule,
  ],
})
export class KeyGroupModule {}
