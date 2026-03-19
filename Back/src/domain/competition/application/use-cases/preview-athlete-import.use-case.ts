import { Injectable } from '@nestjs/common';
import { AthleteImportCsvService } from '../services/athlete-import-csv.service';

export type PreviewAthleteImportInput = {
  csvText: string;
};

@Injectable()
export class PreviewAthleteImportUseCase {
  constructor(
    private readonly athleteImportCsvService: AthleteImportCsvService,
  ) {}

  async execute(input: PreviewAthleteImportInput) {
    const rows = this.athleteImportCsvService.parse(input.csvText);

    return {
      rows: rows.map((row) => ({
        lineNumber: row.lineNumber,
        raw: row.raw,
        athlete: row.athlete
          ? {
              ...row.athlete,
              birthDate: row.athlete.birthDate.toISOString(),
            }
          : null,
        errors: row.errors,
      })),
      totalRows: rows.length,
      totalErrors: rows.reduce((acc, row) => acc + row.errors.length, 0),
    };
  }
}
