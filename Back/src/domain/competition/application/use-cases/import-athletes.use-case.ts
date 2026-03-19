import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@/configuration/logger.configuration';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';
import { ITeamRepository } from '@/domain/team/repository/ITeamRepository.repository';
import { Team } from '@/domain/team/domain/entities/team.entity';
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
    @Inject(ITeamRepository)
    private readonly teamRepository: ITeamRepository,
    private readonly athleteImportCsvService: AthleteImportCsvService,
  ) {}

  async execute(input: ImportAthletesInput) {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(`Competition with id ${input.competitionId} not found`);
    }

    const parsedRows = this.athleteImportCsvService.parse(input.csvText);
    const importedAthletes: Athlete[] = [];
    const errors: { lineNumber: number; errors: string[] }[] = [];
    const teamCache = await this.buildTeamCache(
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
        let teamId: number | null = null;

        if (row.athlete.teamName) {
          const normalizedTeamName = Team.normalizeName(row.athlete.teamName);
          const cachedTeamId = teamCache.get(normalizedTeamName);

          if (cachedTeamId !== undefined) {
            teamId = cachedTeamId;
          } else {
            const team = await this.teamRepository.create(
              Team.create({
                competitionId: input.competitionId,
                name: row.athlete.teamName,
              }),
            );

            teamId = team.id ?? null;

            if (teamId) {
              teamCache.set(normalizedTeamName, teamId);
            }
          }
        }

        const athlete = await this.athleteRepository.create(
          Athlete.create({
            competitionId: input.competitionId,
            fullName: row.athlete.fullName,
            birthDate: row.athlete.birthDate,
            belt: row.athlete.belt,
            declaredWeightGrams: row.athlete.declaredWeightGrams,
            teamId,
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

  private async buildTeamCache(
    competitionId: number,
    parsedRows: ReturnType<AthleteImportCsvService['parse']>,
  ): Promise<Map<string, number>> {
    const teamNames = [
      ...new Set(
        parsedRows
          .flatMap((row) => (row.athlete?.teamName ? [row.athlete.teamName] : []))
          .map((teamName) => Team.normalizeName(teamName)),
      ),
    ];

    const existingTeams = await this.teamRepository.findByCompetitionIdAndNames(
      competitionId,
      teamNames,
    );

    return new Map(
      existingTeams
        .filter((team) => team.id !== undefined)
        .map((team) => [team.name, team.id as number]),
    );
  }
}
