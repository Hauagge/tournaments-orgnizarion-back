import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTableTeams1760000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'teams',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'competition_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'teams',
      new TableIndex({
        name: 'IDX_TEAMS_COMPETITION_ID_NAME',
        columnNames: ['competition_id', 'name'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('teams', 'IDX_TEAMS_COMPETITION_ID_NAME');
    await queryRunner.dropTable('teams');
  }
}
