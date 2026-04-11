import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@/configuration/logger.configuration';
import { Academy } from '@/domain/academy/domain/entities/academy.entity';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';
import { AthleteImportCsvService } from '../services/athlete-import-csv.service';

export type ImportAthletesInput = {
  competitionId: number;
  csvText: string;
};

@Injectable()
export class ImportAthletesUseCase {
  private readonly logger = new Logger(ImportAthletesUseCase.name);

  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
    private readonly athleteImportCsvService: AthleteImportCsvService,
  ) {}

  async execute(input: ImportAthletesInput) {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const parsedRows = this.athleteImportCsvService.parse(input.csvText);
    const importedAthletes: Athlete[] = [];
    const errors: { lineNumber: number; errors: string[] }[] = [];
    const academyCache = await this.buildAcademyCache(
      input.competitionId,
      parsedRows,
    );

    for (const row of parsedRows) {
      if (!row.athlete) {
        errors.push({
          lineNumber: row.lineNumber,
          errors: row.errors,
        });
        continue;
      }

      try {
        let academyId: number | null = null;

        if (row.athlete.academyName) {
          const academyCacheKey = this.buildAcademyCacheKey(
            row.athlete.academyName,
          );
          const cachedAcademyId = academyCache.get(academyCacheKey);

          if (cachedAcademyId !== undefined) {
            academyId = cachedAcademyId;
          } else {
            const existingAcademy =
              await this.academyRepository.findByCompetitionIdAndName(
                input.competitionId,
                row.athlete.academyName,
              );

            if (existingAcademy) {
              academyId = existingAcademy.id ?? null;
            } else {
              const academy = await this.academyRepository.create(
                Academy.create({
                  competitionId: input.competitionId,
                  name: row.athlete.academyName,
                }),
              );

              academyId = academy.id ?? null;
            }

            if (academyId !== null) {
              academyCache.set(academyCacheKey, academyId);
            }
          }
        }

        const athlete = await this.athleteRepository.create(
          Athlete.create({
            competitionId: input.competitionId,
            fullName: row.athlete.fullName,
            documentNumber: row.athlete.documentNumber,
            birthDate: row.athlete.birthDate,
            belt: row.athlete.belt,
            declaredWeight: row.athlete.declaredWeightGrams,
            academyId,
          }),
        );

        importedAthletes.push(athlete);
      } catch (error) {
        errors.push({
          lineNumber: row.lineNumber,
          errors: ['Falha ao importar atleta.'],
        });
        this.logger.warn(
          `Failed to import athlete on line ${row.lineNumber}`,
          error,
        );
      }
    }

    this.logger.info(
      `Athletes import finished for competition ${input.competitionId}. Imported: ${importedAthletes.length}. Failed: ${errors.length}.`,
    );

    return {
      importedCount: importedAthletes.length,
      failedCount: errors.length,
      athletes: importedAthletes.map((athlete) => athlete.toJSON()),
      errors,
    };
  }

  private async buildAcademyCache(
    competitionId: number,
    parsedRows: ReturnType<AthleteImportCsvService['parse']>,
  ): Promise<Map<string, number>> {
    const academyNames = [
      ...new Set(
        parsedRows
          .flatMap((row) =>
            row.athlete?.academyName ? [row.athlete.academyName] : [],
          )
          .map((academyName) => this.buildAcademyCacheKey(academyName)),
      ),
    ];

    const existingAcademies =
      await this.academyRepository.findByCompetitionIdAndNames(
        competitionId,
        academyNames,
      );

    return new Map(
      existingAcademies
        .filter((academy) => academy.id !== undefined)
        .map((academy) => [
          this.buildAcademyCacheKey(academy.name),
          academy.id as number,
        ]),
    );
  }

  private buildAcademyCacheKey(value: string): string {
    return Academy.normalizeName(value).toLocaleLowerCase('en-US');
  }
}
