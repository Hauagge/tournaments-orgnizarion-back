import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const COLUMNS = ['manual_first_athlete_id', 'manual_second_athlete_id'];

export class AddKeyGroupManualPodium1760000028000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const keyGroupsTable = await queryRunner.getTable('key_groups');

    if (!keyGroupsTable) {
      return;
    }

    for (const name of COLUMNS) {
      if (!keyGroupsTable.findColumnByName(name)) {
        await queryRunner.addColumn(
          'key_groups',
          new TableColumn({ name, type: 'int', isNullable: true }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const keyGroupsTable = await queryRunner.getTable('key_groups');

    if (!keyGroupsTable) {
      return;
    }

    for (const name of COLUMNS) {
      if (keyGroupsTable.findColumnByName(name)) {
        await queryRunner.dropColumn('key_groups', name);
      }
    }
  }
}
