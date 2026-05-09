import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUserCompetitions1760000019000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const userCompetitionsTable = await queryRunner.getTable('user_competitions');

    if (!userCompetitionsTable) {
      await queryRunner.createTable(
        new Table({
          name: 'user_competitions',
          columns: [
            {
              name: 'user_id',
              type: 'int',
              isPrimary: true,
            },
            {
              name: 'competition_id',
              type: 'int',
              isPrimary: true,
            },
          ],
        }),
      );
    }

    const refreshedUserCompetitionsTable = await queryRunner.getTable(
      'user_competitions',
    );

    if (
      refreshedUserCompetitionsTable &&
      !refreshedUserCompetitionsTable.indices.some(
        (index) => index.name === 'IDX_USER_COMPETITIONS_COMPETITION_ID',
      )
    ) {
      await queryRunner.createIndex(
        'user_competitions',
        new TableIndex({
          name: 'IDX_USER_COMPETITIONS_COMPETITION_ID',
          columnNames: ['competition_id'],
        }),
      );
    }

    const latestUserCompetitionsTable = await queryRunner.getTable(
      'user_competitions',
    );

    if (
      latestUserCompetitionsTable &&
      !latestUserCompetitionsTable.foreignKeys.some(
        (foreignKey) => foreignKey.name === 'FK_USER_COMPETITIONS_USER_ID',
      )
    ) {
      await queryRunner.createForeignKey(
        'user_competitions',
        new TableForeignKey({
          name: 'FK_USER_COMPETITIONS_USER_ID',
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );
    }

    const userCompetitionsWithUserForeignKey = await queryRunner.getTable(
      'user_competitions',
    );

    if (
      userCompetitionsWithUserForeignKey &&
      !userCompetitionsWithUserForeignKey.foreignKeys.some(
        (foreignKey) => foreignKey.name === 'FK_USER_COMPETITIONS_COMPETITION_ID',
      )
    ) {
      await queryRunner.createForeignKey(
        'user_competitions',
        new TableForeignKey({
          name: 'FK_USER_COMPETITIONS_COMPETITION_ID',
          columnNames: ['competition_id'],
          referencedTableName: 'competitions',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );
    }

    const usersTable = await queryRunner.getTable('users');

    if (usersTable?.findColumnByName('competition_id')) {
      await queryRunner.query(`
        INSERT INTO user_competitions (user_id, competition_id)
        SELECT DISTINCT id, competition_id
        FROM users
        WHERE competition_id IS NOT NULL
        ON CONFLICT (user_id, competition_id) DO NOTHING
      `);

      await queryRunner.dropColumn('users', 'competition_id');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');

    if (usersTable && !usersTable.findColumnByName('competition_id')) {
      await queryRunner.query(`
        ALTER TABLE users
        ADD COLUMN competition_id int NULL
      `);

      await queryRunner.query(`
        UPDATE users AS user_record
        SET competition_id = user_competitions.competition_id
        FROM (
          SELECT user_id, MIN(competition_id) AS competition_id
          FROM user_competitions
          GROUP BY user_id
        ) AS user_competitions
        WHERE user_record.id = user_competitions.user_id
      `);
    }

    const userCompetitionsTable = await queryRunner.getTable('user_competitions');

    if (!userCompetitionsTable) {
      return;
    }

    if (
      userCompetitionsTable.foreignKeys.some(
        (foreignKey) => foreignKey.name === 'FK_USER_COMPETITIONS_COMPETITION_ID',
      )
    ) {
      await queryRunner.dropForeignKey(
        'user_competitions',
        'FK_USER_COMPETITIONS_COMPETITION_ID',
      );
    }

    if (
      userCompetitionsTable.foreignKeys.some(
        (foreignKey) => foreignKey.name === 'FK_USER_COMPETITIONS_USER_ID',
      )
    ) {
      await queryRunner.dropForeignKey(
        'user_competitions',
        'FK_USER_COMPETITIONS_USER_ID',
      );
    }

    if (
      userCompetitionsTable.indices.some(
        (index) => index.name === 'IDX_USER_COMPETITIONS_COMPETITION_ID',
      )
    ) {
      await queryRunner.dropIndex(
        'user_competitions',
        'IDX_USER_COMPETITIONS_COMPETITION_ID',
      );
    }

    await queryRunner.dropTable('user_competitions');
  }
}
