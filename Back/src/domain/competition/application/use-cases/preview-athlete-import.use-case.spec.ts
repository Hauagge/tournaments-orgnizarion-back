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
          documentNumber: null,
          birthDate: new Date(2010, 4, 10).toISOString(),
          belt: 'branca',
          declaredWeightGrams: 65000,
          gender: null,
          academyName: 'Academy One',
          phone: null,
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

  it('reads the Sexo column and rejects unknown values', async () => {
    const useCase = new PreviewAthleteImportUseCase(
      new AthleteImportCsvService(),
    );

    const result = await useCase.execute({
      csvText: [
        'nome,datadenasc,faixa,peso,sexo',
        'Ana Silva,10/05/2010,branca,65,Feminino',
        'Bruno Souza,10/05/2010,azul,80,M',
        'Carla Dias,10/05/2010,azul,60,',
        'Diego Reis,10/05/2010,azul,70,indefinido',
      ].join('\n'),
    });

    expect(result.rows[0].athlete?.gender).toBe('FEMALE');
    expect(result.rows[1].athlete?.gender).toBe('MALE');
    expect(result.rows[2].athlete?.gender).toBeNull();
    expect(result.rows[3].athlete).toBeNull();
    expect(result.rows[3].errors).toContain(
      'Sexo invalido. Use Masculino/Feminino ou M/F.',
    );
  });
});
