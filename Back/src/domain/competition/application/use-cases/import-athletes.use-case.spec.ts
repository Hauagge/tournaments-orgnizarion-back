import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/configuration/logger.configuration';
import {
  InMemoryAthleteRepository,
  InMemoryCompetitionRepository,
  InMemoryAcademyRepository,
} from '../../../../../test/repositories/in-memory';
import { makeCompetition, makeAcademy } from '../../../../../test/factories';
import { AthleteImportCsvService } from '../services/athlete-import-csv.service';
import { ImportAthletesUseCase } from './import-athletes.use-case';

describe('ImportAthletesUseCase', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let athleteRepository: InMemoryAthleteRepository;
  let teamRepository: InMemoryAcademyRepository;
  let useCase: ImportAthletesUseCase;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'info').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 10 }),
    ]);
    athleteRepository = new InMemoryAthleteRepository();
    teamRepository = new InMemoryAcademyRepository();
    useCase = new ImportAthletesUseCase(
      competitionRepository,
      athleteRepository,
      teamRepository,
      new AthleteImportCsvService(),
    );
  });

  it('should import athletes, normalize values and create academy when academyName exists', async () => {
    const result = await useCase.execute({
      competitionId: 10,
      csvText: [
        'nome,datadenasc,faixa,peso,equipe',
        '  Ana   Silva  ,10/05/2010, white ,65, Academy One ',
        'Bruno Souza,2012-08-20,blue,72.5,',
      ].join('\n'),
    });

    expect(result.importedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.athletes).toEqual([
      expect.objectContaining({
        competitionId: 10,
        fullName: 'Ana Silva',
        belt: 'white',
        declaredWeight: 65000,
        academyId: 1,
      }),
      expect.objectContaining({
        competitionId: 10,
        fullName: 'Bruno Souza',
        belt: 'blue',
        declaredWeight: 72500,
        academyId: null,
      }),
    ]);
  });

  it('should collect row failures without stopping the import', async () => {
    const result = await useCase.execute({
      competitionId: 10,
      csvText: [
        'nome,datadenasc,faixa,peso,equipe',
        ',10/05/2010,white,65',
        'Carla Dias,2011-01-01,gray,58',
      ].join('\n'),
    });

    expect(result.importedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.errors).toEqual([
      {
        lineNumber: 2,
        errors: ['Nome e obrigatorio.'],
      },
    ]);
  });

  it('should reuse existing academies loaded in batch before importing athletes', async () => {
    teamRepository = new InMemoryAcademyRepository([
      makeAcademy({
        id: 7,
        competitionId: 10,
        name: 'Academy One',
      }),
    ]);
    useCase = new ImportAthletesUseCase(
      competitionRepository,
      athleteRepository,
      teamRepository,
      new AthleteImportCsvService(),
    );

    const result = await useCase.execute({
      competitionId: 10,
      csvText: [
        'nome,datadenasc,faixa,peso,equipe',
        'Ana Silva,10/05/2010,white,65,Academy One',
        'Bruno Souza,20/08/2012,blue,72.5, Academy One ',
      ].join('\n'),
    });

    expect(result.importedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.athletes).toEqual([
      expect.objectContaining({
        fullName: 'Ana Silva',
        academyId: 7,
      }),
      expect.objectContaining({
        fullName: 'Bruno Souza',
        academyId: 7,
      }),
    ]);
  });

  it('should skip an athlete repeated in the same file by document number', async () => {
    const result = await useCase.execute({
      competitionId: 10,
      csvText: [
        'nome,cpf,datadenasc,faixa,peso',
        'Lorenzo Pereira,142.112.289-86,15/05/2018,gray,35.8',
        'LORENZO DA SILVA PEREIRA,14211228986,15/05/2018,gray,35.6',
      ].join('\n'),
    });

    expect(result.importedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.errors).toEqual([
      { lineNumber: 3, errors: ['Atleta ja cadastrado nesta competicao.'] },
    ]);
  });

  it('should not duplicate athletes when the same file is imported twice', async () => {
    const csvText = [
      'nome,datadenasc,faixa,peso',
      'Ana Silva,10/05/2010,white,65',
      'Bruno Souza,20/08/2012,blue,72.5',
    ].join('\n');

    await useCase.execute({ competitionId: 10, csvText });
    const secondRun = await useCase.execute({ competitionId: 10, csvText });

    expect(secondRun.importedCount).toBe(0);
    expect(secondRun.failedCount).toBe(2);
    expect(await athleteRepository.search({ competitionId: 10 })).toHaveLength(
      2,
    );
  });

  it('should match by name and birth date without document, keeping namesakes born on another date', async () => {
    const result = await useCase.execute({
      competitionId: 10,
      csvText: [
        'nome,datadenasc,faixa,peso',
        'Ana Silva,10/05/2010,white,65',
        '  ana   SILVA ,10/05/2010,white,66',
        'Ana Silva,11/05/2010,white,65',
      ].join('\n'),
    });

    expect(result.importedCount).toBe(2);
    expect(result.errors).toEqual([
      { lineNumber: 3, errors: ['Atleta ja cadastrado nesta competicao.'] },
    ]);
  });
});
