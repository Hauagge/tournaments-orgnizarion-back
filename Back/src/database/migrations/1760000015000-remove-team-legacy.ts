import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class RemoveTeamLegacy1760000015000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const fightsTable = await queryRunner.getTable('fights');

    if (
      fightsTable?.foreignKeys.some(
        (foreignKey) => foreignKey.name === 'FK_FIGHTS_TEAM_MATCH_ID',
      )
    ) {
      await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_TEAM_MATCH_ID');
    }

    if (fightsTable?.findColumnByName('team_match_id')) {
      await queryRunner.dropColumn('fights', 'team_match_id');
    }

    if (fightsTable?.findColumnByName('winner_team_id')) {
      await queryRunner.dropColumn('fights', 'winner_team_id');
    }

    const competitionsTable = await queryRunner.getTable('competitions');
    if (competitionsTable?.findColumnByName('lock_teams_after_weigh_in_starts')) {
      await queryRunner.dropColumn('competitions', 'lock_teams_after_weigh_in_starts');
    }

    const teamMembersTable = await queryRunner.getTable('team_members');
    if (teamMembersTable) {
      if (
        teamMembersTable.foreignKeys.some(
          (foreignKey) => foreignKey.name === 'FK_TEAM_MEMBERS_TEAM_ID',
        )
      ) {
        await queryRunner.dropForeignKey('team_members', 'FK_TEAM_MEMBERS_TEAM_ID');
      }
      if (
        teamMembersTable.foreignKeys.some(
          (foreignKey) => foreignKey.name === 'FK_TEAM_MEMBERS_ATHLETE_ID',
        )
      ) {
        await queryRunner.dropForeignKey('team_members', 'FK_TEAM_MEMBERS_ATHLETE_ID');
      }
      await queryRunner.dropTable('team_members');
    }

    const teamMatchesTable = await queryRunner.getTable('team_matches');
    if (teamMatchesTable) {
      if (
        teamMatchesTable.foreignKeys.some(
          (foreignKey) => foreignKey.name === 'FK_TEAM_MATCHES_TEAM_A_ID',
        )
      ) {
        await queryRunner.dropForeignKey('team_matches', 'FK_TEAM_MATCHES_TEAM_A_ID');
      }
      if (
        teamMatchesTable.foreignKeys.some(
          (foreignKey) => foreignKey.name === 'FK_TEAM_MATCHES_TEAM_B_ID',
        )
      ) {
        await queryRunner.dropForeignKey('team_matches', 'FK_TEAM_MATCHES_TEAM_B_ID');
      }
      if (
        teamMatchesTable.foreignKeys.some(
          (foreignKey) => foreignKey.name === 'FK_TEAM_MATCHES_COMPETITION_ID',
        )
      ) {
        await queryRunner.dropForeignKey(
          'team_matches',
          'FK_TEAM_MATCHES_COMPETITION_ID',
        );
      }
      await queryRunner.dropTable('team_matches');
    }

    const teamsTable = await queryRunner.getTable('teams');
    if (teamsTable) {
      if (
        teamsTable.foreignKeys.some(
          (foreignKey) => foreignKey.name === 'FK_TEAMS_COMPETITION_ID',
        )
      ) {
        await queryRunner.dropForeignKey('teams', 'FK_TEAMS_COMPETITION_ID');
      }
      await queryRunner.dropTable('teams');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const competitionsTable = await queryRunner.getTable('competitions');
    if (!competitionsTable?.findColumnByName('lock_teams_after_weigh_in_starts')) {
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

    const teamsTable = await queryRunner.getTable('teams');
    if (!teamsTable) {
      await queryRunner.query(`
        CREATE TABLE teams (
          id SERIAL PRIMARY KEY,
          competition_id INT NOT NULL,
          name VARCHAR NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await queryRunner.createForeignKey(
        'teams',
        new TableForeignKey({
          name: 'FK_TEAMS_COMPETITION_ID',
          columnNames: ['competition_id'],
          referencedTableName: 'competitions',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );
    }

    const teamMembersTable = await queryRunner.getTable('team_members');
    if (!teamMembersTable) {
      await queryRunner.query(`
        CREATE TABLE team_members (
          id SERIAL PRIMARY KEY,
          team_id INT NOT NULL,
          athlete_id INT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await queryRunner.createForeignKeys('team_members', [
        new TableForeignKey({
          name: 'FK_TEAM_MEMBERS_TEAM_ID',
          columnNames: ['team_id'],
          referencedTableName: 'teams',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
        new TableForeignKey({
          name: 'FK_TEAM_MEMBERS_ATHLETE_ID',
          columnNames: ['athlete_id'],
          referencedTableName: 'athletes',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      ]);
    }

    const teamMatchesTable = await queryRunner.getTable('team_matches');
    if (!teamMatchesTable) {
      await queryRunner.query(`
        CREATE TABLE team_matches (
          id SERIAL PRIMARY KEY,
          competition_id INT NOT NULL,
          team_a_id INT NOT NULL,
          team_b_id INT NOT NULL,
          status VARCHAR NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await queryRunner.createForeignKeys('team_matches', [
        new TableForeignKey({
          name: 'FK_TEAM_MATCHES_COMPETITION_ID',
          columnNames: ['competition_id'],
          referencedTableName: 'competitions',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
        new TableForeignKey({
          name: 'FK_TEAM_MATCHES_TEAM_A_ID',
          columnNames: ['team_a_id'],
          referencedTableName: 'teams',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
        new TableForeignKey({
          name: 'FK_TEAM_MATCHES_TEAM_B_ID',
          columnNames: ['team_b_id'],
          referencedTableName: 'teams',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      ]);
    }

    const fightsTable = await queryRunner.getTable('fights');
    if (!fightsTable?.findColumnByName('team_match_id')) {
      await queryRunner.addColumn(
        'fights',
        new TableColumn({
          name: 'team_match_id',
          type: 'int',
          isNullable: true,
        }),
      );
      await queryRunner.createForeignKey(
        'fights',
        new TableForeignKey({
          name: 'FK_FIGHTS_TEAM_MATCH_ID',
          columnNames: ['team_match_id'],
          referencedTableName: 'team_matches',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        }),
      );
    }

    if (!fightsTable?.findColumnByName('winner_team_id')) {
      await queryRunner.addColumn(
        'fights',
        new TableColumn({
          name: 'winner_team_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }
  }
}
