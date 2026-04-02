import { Inject, Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { PdfRendererResolverService } from '../services/pdf-renderer-resolver.service';

@Injectable()
export class ExportCompetitionBracketsPdfUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    private readonly resolver: PdfRendererResolverService,
  ) {}

  async execute(competitionId: number) {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    if (![CompetitionMode.KEYS, CompetitionMode.ABSOLUTE_GP].includes(competition.mode)) {
      throw new ValidationError(`Unsupported competition mode for PDF export: ${competition.mode}`);
    }

    const buffer = await this.resolver.resolve(competition.mode).render(competitionId);

    return {
      buffer,
      fileName: `brackets-${competitionId}-${competition.mode.toLowerCase()}.pdf`,
    };
  }
}
