import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { ChampionAcademiesReportUseCase } from '@/domain/reports/application/use-cases/champion-academies-report.use-case';
import { CompetitionResultsUseCase } from '@/domain/reports/application/use-cases/competition-results.use-case';
import {
  CategoryResultView,
  ResultAthleteView,
} from '@/domain/reports/application/use-cases/competition-results.view';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { PdfRendererService } from '../services/pdf-renderer.service';
import { TemplateRendererService } from '../services/template-renderer.service';

type PodiumRow = {
  categoryName: string;
  decided: boolean;
  first: string | null;
  second: string | null;
  thirds: string[];
};

@Injectable()
export class ExportCompetitionResultsPdfUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    private readonly competitionResultsUseCase: CompetitionResultsUseCase,
    private readonly championAcademiesReportUseCase: ChampionAcademiesReportUseCase,
    private readonly templateRendererService: TemplateRendererService,
    private readonly pdfRendererService: PdfRendererService,
  ) {}

  async execute(competitionId: number): Promise<{
    buffer: Buffer;
    fileName: string;
  }> {
    const competition =
      await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    // Mesmas fontes da tela de Resultados: o PDF nao pode divergir dela.
    const [results, ranking] = await Promise.all([
      this.competitionResultsUseCase.execute({ competitionId }),
      this.championAcademiesReportUseCase.execute({ competitionId }),
    ]);

    const html = await this.templateRendererService.render(
      'competition-results-report.hbs',
      {
        competitionName: competition.name,
        exportedAt: new Date().toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
        totalCategories: results.totalCategories,
        decidedCategories: results.decidedCategories,
        academies: ranking.academies.map((academy) => ({
          position: academy.position,
          academyName: academy.academyName,
          totalChampions: academy.totalChampions,
          totalSilvers: academy.totalSilvers,
          totalBronzes: academy.totalBronzes,
        })),
        podiums: results.categories.flatMap((category) =>
          this.toPodiumRows(category),
        ),
      },
    );
    const buffer = await this.pdfRendererService.renderFromHtml(html);

    return {
      buffer,
      fileName: this.buildFileName(competition.name),
    };
  }

  private toPodiumRows(category: CategoryResultView): PodiumRow[] {
    const rows: PodiumRow[] = [
      {
        categoryName: category.categoryName,
        decided: category.decided,
        first: this.formatAthlete(category.first),
        second: this.formatAthlete(category.second),
        thirds: category.thirds.map((athlete) => this.formatAthlete(athlete)!),
      },
    ];

    if (category.secondarySeries) {
      const series = category.secondarySeries;

      rows.push({
        categoryName: `${category.categoryName} · ${series.label}`,
        decided: category.decided,
        first: this.formatAthlete(series.first),
        second: this.formatAthlete(series.second),
        thirds: series.thirds.map((athlete) => this.formatAthlete(athlete)!),
      });
    }

    return rows;
  }

  private formatAthlete(athlete: ResultAthleteView | null): string | null {
    if (!athlete) {
      return null;
    }

    return athlete.academyName
      ? `${athlete.athleteName} (${athlete.academyName})`
      : athlete.athleteName;
  }

  private buildFileName(competitionName: string): string {
    const slug = competitionName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    return `${slug || 'competition'}-resultados.pdf`;
  }
}
