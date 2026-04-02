import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { SimplePdfBuilderService } from '../services/simple-pdf-builder.service';
import { PdfRendererStrategy } from './pdf-renderer.strategy';

@Injectable()
export class AbsoluteGpPdfRendererStrategy implements PdfRendererStrategy {
  readonly mode = CompetitionMode.ABSOLUTE_GP;

  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    private readonly pdfBuilder: SimplePdfBuilderService,
  ) {}

  async render(competitionId: number): Promise<Buffer> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    const categories = await this.categoryRepository.listByCompetitionId(competitionId);
    const fights = await this.fightRepository.listByCompetitionId({ competitionId });
    const athleteIds = Array.from(
      new Set(fights.flatMap((fight) => [fight.athleteAId, fight.athleteBId])),
    );
    const athletes = await this.athleteRepository.findByIds(athleteIds);
    const athleteNames = new Map(athletes.map((athlete) => [athlete.id as number, athlete.fullName]));

    return this.pdfBuilder.build(
      categories.map((category) => {
        const categoryFights = fights.filter((fight) => fight.categoryId === category.id);

        return {
          title: category.name,
          lines: [
            `Campeonato: ${competition.name}`,
            `Modo: ABSOLUTE_GP`,
            `Exportado em: ${new Date().toLocaleString('pt-BR')}`,
            `Total de atletas: ${category.totalAthletes}`,
            '',
            'Confrontos:',
            ...categoryFights.map(
              (fight) =>
                `${fight.orderIndex}. ${athleteNames.get(fight.athleteAId) ?? `#${fight.athleteAId}`} vs ${athleteNames.get(fight.athleteBId) ?? `#${fight.athleteBId}`} (${fight.status})`,
            ),
          ],
        };
      }),
    );
  }
}
