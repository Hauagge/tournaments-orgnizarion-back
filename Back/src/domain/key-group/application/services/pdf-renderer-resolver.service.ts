import { Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { AbsoluteGpPdfRendererStrategy } from '../strategies/absolute-gp-pdf-renderer.strategy';
import { KeysPdfRendererStrategy } from '../strategies/keys-pdf-renderer.strategy';
import { PdfRendererStrategy } from '../strategies/pdf-renderer.strategy';

@Injectable()
export class PdfRendererResolverService {
  constructor(
    private readonly keysRenderer: KeysPdfRendererStrategy,
    private readonly absoluteGpRenderer: AbsoluteGpPdfRendererStrategy,
  ) {}

  resolve(mode: CompetitionMode): PdfRendererStrategy {
    if (mode === CompetitionMode.KEYS) {
      return this.keysRenderer;
    }

    if (mode === CompetitionMode.ABSOLUTE_GP) {
      return this.absoluteGpRenderer;
    }

    throw new ValidationError(`Unsupported bracket PDF mode: ${mode}`);
  }
}
