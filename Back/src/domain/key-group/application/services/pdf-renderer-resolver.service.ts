import { Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { AbsoluteGpPdfRendererStrategy } from '../strategies/absolute-gp-pdf-renderer.strategy';
import { KeysPdfRendererStrategy } from '../strategies/keys-pdf-renderer.strategy';
import { PdfRendererStrategy } from '../strategies/pdf-renderer.strategy';

@Injectable()
export class PdfRendererResolverService {
  private readonly renderers: PdfRendererStrategy[];

  constructor(
    keysRenderer: KeysPdfRendererStrategy,
    absoluteGpRenderer: AbsoluteGpPdfRendererStrategy,
  ) {
    this.renderers = [keysRenderer, absoluteGpRenderer];
  }

  resolve(mode: CompetitionMode): PdfRendererStrategy {
    const renderer = this.renderers.find(
      (candidate) => candidate.mode === mode,
    );

    if (!renderer) {
      throw new ValidationError(`Unsupported bracket PDF mode: ${mode}`);
    }

    return renderer;
  }
}
