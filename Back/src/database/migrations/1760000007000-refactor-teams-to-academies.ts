import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class RefactorTeamsToAcademies1760000007000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'academies',
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
      'academies',
      new TableIndex({
        name: 'IDX_ACADEMIES_COMPETITION_ID_NAME',
        columnNames: ['competition_id', 'name'],
        isUnique: true,
      }),
    );

    await queryRunner.addColumn(
      'athletes',
      new TableColumn({
        name: 'academy_id',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      INSERT INTO academies (competition_id, name, created_at)
      SELECT competition_id, name, created_at
      FROM teams
      ORDER BY id
    `);

    await queryRunner.query(`
      UPDATE athletes AS athlete
      SET academy_id = academy.id
      FROM teams AS team
      INNER JOIN academies AS academy
        ON academy.competition_id = team.competition_id
       AND academy.name = team.name
      WHERE athlete.team_id = team.id
    `);

    await queryRunner.createIndex(
      'athletes',
      new TableIndex({
        name: 'IDX_ATHLETES_ACADEMY_ID',
        columnNames: ['academy_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'athletes',
      new TableForeignKey({
        name: 'FK_ATHLETES_ACADEMY_ID',
        columnNames: ['academy_id'],
        referencedTableName: 'academies',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.dropForeignKey('athletes', 'FK_ATHLETES_TEAM_ID');
    await queryRunner.dropIndex('athletes', 'IDX_ATHLETES_TEAM_ID');
    await queryRunner.dropColumn('athletes', 'team_id');
    await queryRunner.dropIndex('teams', 'IDX_TEAMS_COMPETITION_ID_NAME');
    await queryRunner.dropTable('teams');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.addColumn(
      'athletes',
      new TableColumn({
        name: 'team_id',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      INSERT INTO teams (competition_id, name, created_at)
      SELECT competition_id, name, created_at
      FROM academies
      ORDER BY id
    `);

    await queryRunner.query(`
      UPDATE athletes AS athlete
      SET team_id = team.id
      FROM academies AS academy
      INNER JOIN teams AS team
        ON team.competition_id = academy.competition_id
       AND team.name = academy.name
      WHERE athlete.academy_id = academy.id
    `);

    await queryRunner.createIndex(
      'athletes',
      new TableIndex({
        name: 'IDX_ATHLETES_TEAM_ID',
        columnNames: ['team_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'athletes',
      new TableForeignKey({
        name: 'FK_ATHLETES_TEAM_ID',
        columnNames: ['team_id'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.dropForeignKey('athletes', 'FK_ATHLETES_ACADEMY_ID');
    await queryRunner.dropIndex('athletes', 'IDX_ATHLETES_ACADEMY_ID');
    await queryRunner.dropColumn('athletes', 'academy_id');
    await queryRunner.dropIndex('academies', 'IDX_ACADEMIES_COMPETITION_ID_NAME');
    await queryRunner.dropTable('academies');
  }
}
