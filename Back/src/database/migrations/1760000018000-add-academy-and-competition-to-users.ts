import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAcademyAndCompetitionToUsers1760000018000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');

    if (!usersTable) {
      return;
    }

    if (!usersTable.findColumnByName('academy_id')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'academy_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    if (!usersTable.findColumnByName('competition_id')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'competition_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');

    if (!usersTable) {
      return;
    }

    if (usersTable.findColumnByName('competition_id')) {
      await queryRunner.dropColumn('users', 'competition_id');
    }

    if (usersTable.findColumnByName('academy_id')) {
      await queryRunner.dropColumn('users', 'academy_id');
    }
  }
}
