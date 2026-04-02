import { describe, expect, it } from 'vitest';
import { AthleteImportCsvService } from '../services/athlete-import-csv.service';
import { PreviewAthleteImportUseCase } from './preview-athlete-import.use-case';

describe('PreviewAthleteImportUseCase', () => {
  it('should parse rows, normalize fields and return validation errors', async () => {
    const useCase = new PreviewAthleteImportUseCase(
      new AthleteImportCsvService(),
    );

    const result = await useCase.execute({
      csvText: [
        'nome,datadenasc,faixa,peso,equipe',
        '  Ana   Silva  ,10/05/2010, branca ,65, Academy One ',
        'Bruno,,azul,',
      ].join('\n'),
    });

    expect(result.totalRows).toBe(2);
    expect(result.totalErrors).toBe(2);
    expect(result.rows).toEqual([
      {
        lineNumber: 2,
        raw: {
          nome: '  Ana   Silva  ',
          datadenasc: '10/05/2010',
          faixa: ' branca ',
          peso: '65',
          equipe: ' Academy One ',
        },
        athlete: {
          fullName: 'Ana Silva',
          birthDate: '2010-05-10T00:00:00.000Z',
          belt: 'branca',
          declaredWeightGrams: 65000,
          academyName: 'Academy One',
          age: null,
        },
        errors: [],
      },
      {
        lineNumber: 3,
        raw: {
          nome: 'Bruno',
          datadenasc: '',
          faixa: 'azul',
          peso: '',
          equipe: '',
        },
        athlete: null,
        errors: ['Data de nascimento invalida.', 'Peso invalido.'],
      },
    ]);
  });
});
