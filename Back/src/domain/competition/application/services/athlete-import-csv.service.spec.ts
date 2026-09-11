import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/shared/errors/validation.error';
import {
  AthleteImportCsvService,
  MAX_IMPORT_CSV_ROWS,
} from './athlete-import-csv.service';

function buildCsvWithRows(rowCount: number): string {
  const header = 'nome,datadenasc,faixa,peso';
  const rows = Array.from(
    { length: rowCount },
    (_, index) => `Atleta ${index},10/05/2010,branca,65`,
  );

  return [header, ...rows].join('\n');
}

describe('AthleteImportCsvService', () => {
  it('parses rows within the configured limit', () => {
    const service = new AthleteImportCsvService();

    const rows = service.parse(buildCsvWithRows(MAX_IMPORT_CSV_ROWS));

    expect(rows).toHaveLength(MAX_IMPORT_CSV_ROWS);
  });

  it('rejects a csv that exceeds the maximum number of data rows', () => {
    const service = new AthleteImportCsvService();

    expect(() =>
      service.parse(buildCsvWithRows(MAX_IMPORT_CSV_ROWS + 1)),
    ).toThrow(ValidationError);
  });
});
