import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';
import { ValidationError } from '@/shared/errors/validation.error';

@Injectable()
export class PdfRendererService {
  async renderFromHtml(html: string): Promise<Buffer> {
    let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '16mm',
          right: '12mm',
          bottom: '16mm',
          left: '12mm',
        },
      });

      return Buffer.from(pdf);
    } catch (error) {
      throw new ValidationError(
        'Unable to render PDF. Ensure Playwright Chromium is installed with "npx playwright install chromium".',
        error instanceof Error ? error.message : error,
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
