import { Injectable } from '@nestjs/common';

type PdfPage = {
  title: string;
  lines: string[];
};

@Injectable()
export class SimplePdfBuilderService {
  build(pages: PdfPage[]): Buffer {
    const contentObjects = pages.map((page) => this.buildContentStream(page));
    const pageIds = pages.map((_, index) => 4 + index * 2);
    const contentIds = pages.map((_, index) => 5 + index * 2);
    const objects: string[] = [];

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    pages.forEach((_, index) => {
      objects[pageIds[index]] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentIds[index]} 0 R >>`;
      objects[contentIds[index]] =
        `<< /Length ${Buffer.byteLength(contentObjects[index], 'utf8')} >>\nstream\n${contentObjects[index]}\nendstream`;
    });

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (let id = 1; id < objects.length; id++) {
      offsets[id] = Buffer.byteLength(pdf, 'utf8');
      pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }

    const xrefPosition = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;

    for (let id = 1; id < objects.length; id++) {
      pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  private buildContentStream(page: PdfPage): string {
    const lines = [page.title, ...page.lines].map((line) => this.escape(line));
    const commands = ['BT', '/F1 18 Tf', '50 790 Td', `(${lines[0]}) Tj`, '0 -28 Td', '/F1 12 Tf'];

    for (let index = 1; index < lines.length; index++) {
      commands.push(`(${lines[index]}) Tj`);
      if (index < lines.length - 1) {
        commands.push('0 -18 Td');
      }
    }

    commands.push('ET');
    return commands.join('\n');
  }

  private escape(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
