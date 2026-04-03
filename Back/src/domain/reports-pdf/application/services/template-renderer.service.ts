import { Injectable } from '@nestjs/common';
import Handlebars, { type TemplateDelegate } from 'handlebars';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class TemplateRendererService {
  private readonly compiledTemplates = new Map<string, TemplateDelegate>();

  async render(templateName: string, context: object): Promise<string> {
    const template = await this.getCompiledTemplate(templateName);
    return template(context);
  }

  private async getCompiledTemplate(
    templateName: string,
  ): Promise<TemplateDelegate> {
    const cached = this.compiledTemplates.get(templateName);

    if (cached) {
      return cached;
    }

    const templatePaths = [
      join(
        process.cwd(),
        'dist',
        'domain',
        'reports-pdf',
        'templates',
        templateName,
      ),
      join(
        process.cwd(),
        'src',
        'domain',
        'reports-pdf',
        'templates',
        templateName,
      ),
    ];

    for (const templatePath of templatePaths) {
      try {
        const source = await readFile(templatePath, 'utf-8');
        const compiled = Handlebars.compile(source);
        this.compiledTemplates.set(templateName, compiled);
        return compiled;
      } catch {}
    }

    throw new Error(`Template ${templateName} not found`);
  }
}
