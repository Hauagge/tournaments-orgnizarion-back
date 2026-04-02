import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { IKeyGroupRepository } from '../../repository/IKeyGroupRepository.repository';
import { SimplePdfBuilderService } from '../services/simple-pdf-builder.service';
import { PdfRendererStrategy } from './pdf-renderer.strategy';

@Injectable()
export class KeysPdfRendererStrategy implements PdfRendererStrategy {
  readonly mode = CompetitionMode.KEYS;

  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    private readonly pdfBuilder: SimplePdfBuilderService,
  ) {}

  async render(competitionId: number): Promise<Buffer> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    const [groups, categories] = await Promise.all([
      this.keyGroupRepository.listByCompetitionId({ competitionId }),
      this.categoryRepository.listByCompetitionId(competitionId),
    ]);
    const categoryNames = new Map(categories.map((category) => [category.id as number, category.name]));
    const details = await Promise.all(
      groups.map((group) => this.keyGroupRepository.getDetails(group.id)),
    );

    return this.pdfBuilder.build(
      details
        .filter((group): group is NonNullable<typeof group> => group !== null)
        .map((group, index) => ({
          title: group.name ?? `Chave ${index + 1}`,
          lines: [
            `Campeonato: ${competition.name}`,
            `Modo: KEYS`,
            `Exportado em: ${new Date().toLocaleString('pt-BR')}`,
            `Categoria: ${group.categoryId ? (categoryNames.get(group.categoryId) ?? `#${group.categoryId}`) : 'Sem categoria'}`,
            `Status: ${group.status}`,
            '',
            'Atletas:',
            ...group.members.map((member) => `- ${member.fullName} | ${member.belt} | ${member.academyName ?? 'Sem academy'}`),
            '',
            'Lutas:',
            ...group.fights.map(
              (fight) =>
                `${fight.orderIndex}. ${fight.athleteAName ?? `#${fight.athleteAId}`} vs ${fight.athleteBName ?? `#${fight.athleteBId}`} (${fight.status})`,
            ),
          ],
        })),
    );
  }
}
