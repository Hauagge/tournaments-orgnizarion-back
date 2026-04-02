import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateFightsAndTeamMatches1760000010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'team_matches',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'competition_id', type: 'int', isNullable: false },
          { name: 'team_a_id', type: 'int', isNullable: false },
          { name: 'team_b_id', type: 'int', isNullable: false },
          { name: 'status', type: 'varchar', isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'fights',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'competition_id', type: 'int', isNullable: false },
          { name: 'category_id', type: 'int', isNullable: true },
          { name: 'team_match_id', type: 'int', isNullable: true },
          { name: 'area_id', type: 'int', isNullable: true },
          { name: 'status', type: 'varchar', isNullable: false },
          { name: 'athlete_a_id', type: 'int', isNullable: false },
          { name: 'athlete_b_id', type: 'int', isNullable: false },
          { name: 'winner_athlete_id', type: 'int', isNullable: true },
          { name: 'winner_team_id', type: 'int', isNullable: true },
          { name: 'win_type', type: 'varchar', isNullable: true },
          { name: 'started_at', type: 'timestamp', isNullable: true },
          { name: 'finished_at', type: 'timestamp', isNullable: true },
          { name: 'order_index', type: 'int', isNullable: false },
        ],
      }),
    );

    await queryRunner.createIndex('team_matches', new TableIndex({ name: 'IDX_TEAM_MATCHES_COMPETITION_ID', columnNames: ['competition_id'] }));
    await queryRunner.createIndex('fights', new TableIndex({ name: 'IDX_FIGHTS_COMPETITION_ID', columnNames: ['competition_id'] }));
    await queryRunner.createIndex('fights', new TableIndex({ name: 'IDX_FIGHTS_STATUS', columnNames: ['status'] }));
    await queryRunner.createIndex('fights', new TableIndex({ name: 'IDX_FIGHTS_TEAM_MATCH_ID', columnNames: ['team_match_id'] }));
    await queryRunner.createIndex('fights', new TableIndex({ name: 'IDX_FIGHTS_CATEGORY_ID', columnNames: ['category_id'] }));

    await queryRunner.createForeignKey('team_matches', new TableForeignKey({ name: 'FK_TEAM_MATCHES_COMPETITION_ID', columnNames: ['competition_id'], referencedTableName: 'competitions', referencedColumnNames: ['id'], onDelete: 'CASCADE', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('team_matches', new TableForeignKey({ name: 'FK_TEAM_MATCHES_TEAM_A_ID', columnNames: ['team_a_id'], referencedTableName: 'teams', referencedColumnNames: ['id'], onDelete: 'CASCADE', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('team_matches', new TableForeignKey({ name: 'FK_TEAM_MATCHES_TEAM_B_ID', columnNames: ['team_b_id'], referencedTableName: 'teams', referencedColumnNames: ['id'], onDelete: 'CASCADE', onUpdate: 'CASCADE' }));

    await queryRunner.createForeignKey('fights', new TableForeignKey({ name: 'FK_FIGHTS_COMPETITION_ID', columnNames: ['competition_id'], referencedTableName: 'competitions', referencedColumnNames: ['id'], onDelete: 'CASCADE', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('fights', new TableForeignKey({ name: 'FK_FIGHTS_CATEGORY_ID', columnNames: ['category_id'], referencedTableName: 'categories', referencedColumnNames: ['id'], onDelete: 'SET NULL', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('fights', new TableForeignKey({ name: 'FK_FIGHTS_TEAM_MATCH_ID', columnNames: ['team_match_id'], referencedTableName: 'team_matches', referencedColumnNames: ['id'], onDelete: 'SET NULL', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('fights', new TableForeignKey({ name: 'FK_FIGHTS_ATHLETE_A_ID', columnNames: ['athlete_a_id'], referencedTableName: 'athletes', referencedColumnNames: ['id'], onDelete: 'CASCADE', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('fights', new TableForeignKey({ name: 'FK_FIGHTS_ATHLETE_B_ID', columnNames: ['athlete_b_id'], referencedTableName: 'athletes', referencedColumnNames: ['id'], onDelete: 'CASCADE', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('fights', new TableForeignKey({ name: 'FK_FIGHTS_WINNER_ATHLETE_ID', columnNames: ['winner_athlete_id'], referencedTableName: 'athletes', referencedColumnNames: ['id'], onDelete: 'SET NULL', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('fights', new TableForeignKey({ name: 'FK_FIGHTS_WINNER_TEAM_ID', columnNames: ['winner_team_id'], referencedTableName: 'teams', referencedColumnNames: ['id'], onDelete: 'SET NULL', onUpdate: 'CASCADE' }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_WINNER_TEAM_ID');
    await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_WINNER_ATHLETE_ID');
    await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_ATHLETE_B_ID');
    await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_ATHLETE_A_ID');
    await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_TEAM_MATCH_ID');
    await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_CATEGORY_ID');
    await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_COMPETITION_ID');
    await queryRunner.dropForeignKey('team_matches', 'FK_TEAM_MATCHES_TEAM_B_ID');
    await queryRunner.dropForeignKey('team_matches', 'FK_TEAM_MATCHES_TEAM_A_ID');
    await queryRunner.dropForeignKey('team_matches', 'FK_TEAM_MATCHES_COMPETITION_ID');
    await queryRunner.dropIndex('fights', 'IDX_FIGHTS_CATEGORY_ID');
    await queryRunner.dropIndex('fights', 'IDX_FIGHTS_TEAM_MATCH_ID');
    await queryRunner.dropIndex('fights', 'IDX_FIGHTS_STATUS');
    await queryRunner.dropIndex('fights', 'IDX_FIGHTS_COMPETITION_ID');
    await queryRunner.dropIndex('team_matches', 'IDX_TEAM_MATCHES_COMPETITION_ID');
    await queryRunner.dropTable('fights');
    await queryRunner.dropTable('team_matches');
  }
}
