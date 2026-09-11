import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';
import { ValidationError } from '@/shared/errors/validation.error';
import { ConcurrencyLimiter } from './pdf-render-limiter';

// A headless Chromium per render is expensive (CPU/memory). This is a
// single-event local app, not a high-scale service, so we cap how many
// renders run at once and how many more can wait before we start rejecting.
const MAX_CONCURRENT_RENDERS = 2;
const MAX_QUEUED_RENDERS = 3;
const RENDER_TIMEOUT_MS = 30_000;

class PdfRenderTimeoutError extends Error {}

@Injectable()
export class PdfRendererService {
  private readonly limiter = new ConcurrencyLimiter(
    MAX_CONCURRENT_RENDERS,
    MAX_QUEUED_RENDERS,
  );

  async renderFromHtml(html: string): Promise<Buffer> {
    return this.limiter.run(() => this.render(html));
  }

  private async render(html: string): Promise<Buffer> {
    let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      const pdf = await this.withTimeout(async () => {
        await page.setContent(html, { waitUntil: 'networkidle' });

        return page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '16mm',
            right: '12mm',
            bottom: '16mm',
            left: '12mm',
          },
        });
      }, RENDER_TIMEOUT_MS);

      return Buffer.from(pdf);
    } catch (error) {
      if (error instanceof PdfRenderTimeoutError) {
        throw new ValidationError(
          `PDF generation timed out after ${RENDER_TIMEOUT_MS / 1000}s.`,
        );
      }

      throw new ValidationError(
        'Unable to render PDF. Install the Playwright browser with "npx playwright install chromium-headless-shell" (enough for PDF, ~257MB) or "npx playwright install chromium" for the full build.',
        error instanceof Error ? error.message : error,
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PdfRenderTimeoutError()), ms);
    });

    try {
      return await Promise.race([fn(), timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }
}
