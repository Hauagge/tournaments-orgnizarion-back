import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTableCompetitions1760000001000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'competitions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'mode',
            type: 'varchar',
          },
          {
            name: 'fight_duration_seconds',
            type: 'int',
          },
          {
            name: 'weigh_in_margin_grams',
            type: 'int',
          },
          {
            name: 'age_split_years',
            type: 'int',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        checks: [
          {
            name: 'CHK_competitions_mode',
            expression: "mode IN ('TEAM', 'ABSOLUTE_GP')",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('competitions');
  }
}
