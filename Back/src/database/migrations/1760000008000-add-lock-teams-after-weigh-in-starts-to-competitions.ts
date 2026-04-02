import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLockTeamsAfterWeighInStartsToCompetitions1760000008000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'competitions',
      new TableColumn({
        name: 'lock_teams_after_weigh_in_starts',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(
      'competitions',
      'lock_teams_after_weigh_in_starts',
    );
  }
}
