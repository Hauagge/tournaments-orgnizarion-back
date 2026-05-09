import {
  MigrationInterface,
  QueryRunner,
  TableCheck,
  TableColumn,
} from 'typeorm';

export class AddRoleToUserCompetitions1760000020000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const userCompetitionsTable = await queryRunner.getTable('user_competitions');

    if (!userCompetitionsTable) {
      return;
    }

    if (!userCompetitionsTable.findColumnByName('role')) {
      await queryRunner.addColumn(
        'user_competitions',
        new TableColumn({
          name: 'role',
          type: 'varchar',
          isNullable: false,
          default: "'MEMBER'",
        }),
      );
    }

    await queryRunner.query(
      `UPDATE user_competitions SET role = 'MEMBER' WHERE role IS NULL`,
    );

    const refreshedTable = await queryRunner.getTable('user_competitions');

    if (
      refreshedTable &&
      !refreshedTable.checks.some(
        (check) => check.name === 'CHK_USER_COMPETITIONS_ROLE',
      )
    ) {
      await queryRunner.createCheckConstraint(
        'user_competitions',
        new TableCheck({
          name: 'CHK_USER_COMPETITIONS_ROLE',
          expression: "role IN ('OWNER', 'MEMBER')",
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const userCompetitionsTable = await queryRunner.getTable('user_competitions');

    if (!userCompetitionsTable) {
      return;
    }

    if (
      userCompetitionsTable.checks.some(
        (check) => check.name === 'CHK_USER_COMPETITIONS_ROLE',
      )
    ) {
      await queryRunner.dropCheckConstraint(
        'user_competitions',
        'CHK_USER_COMPETITIONS_ROLE',
      );
    }

    if (userCompetitionsTable.findColumnByName('role')) {
      await queryRunner.dropColumn('user_competitions', 'role');
    }
  }
}
