import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateCompetitionTeams1760000009000 implements MigrationInterface {
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
        name: 'IDX_TEAMS_COMPETITION_ID',
        columnNames: ['competition_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'team_members',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'team_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'athlete_id',
            type: 'int',
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
      'team_members',
      new TableIndex({
        name: 'IDX_TEAM_MEMBERS_TEAM_ID',
        columnNames: ['team_id'],
      }),
    );

    await queryRunner.createIndex(
      'team_members',
      new TableIndex({
        name: 'IDX_TEAM_MEMBERS_ATHLETE_ID',
        columnNames: ['athlete_id'],
      }),
    );

    await queryRunner.createIndex(
      'team_members',
      new TableIndex({
        name: 'UQ_TEAM_MEMBERS_TEAM_ID_ATHLETE_ID',
        columnNames: ['team_id', 'athlete_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'team_members',
      new TableForeignKey({
        name: 'FK_TEAM_MEMBERS_TEAM_ID',
        columnNames: ['team_id'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'team_members',
      new TableForeignKey({
        name: 'FK_TEAM_MEMBERS_ATHLETE_ID',
        columnNames: ['athlete_id'],
        referencedTableName: 'athletes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('team_members', 'FK_TEAM_MEMBERS_ATHLETE_ID');
    await queryRunner.dropForeignKey('team_members', 'FK_TEAM_MEMBERS_TEAM_ID');
    await queryRunner.dropIndex('team_members', 'UQ_TEAM_MEMBERS_TEAM_ID_ATHLETE_ID');
    await queryRunner.dropIndex('team_members', 'IDX_TEAM_MEMBERS_ATHLETE_ID');
    await queryRunner.dropIndex('team_members', 'IDX_TEAM_MEMBERS_TEAM_ID');
    await queryRunner.dropTable('team_members');
    await queryRunner.dropIndex('teams', 'IDX_TEAMS_COMPETITION_ID');
    await queryRunner.dropTable('teams');
  }
}
