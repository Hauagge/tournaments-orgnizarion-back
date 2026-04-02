import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';

export abstract class PdfRendererStrategy {
  abstract readonly mode: CompetitionMode;
  abstract render(competitionId: number): Promise<Buffer>;
}
