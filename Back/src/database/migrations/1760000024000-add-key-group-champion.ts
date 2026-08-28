import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddKeyGroupChampion1760000024000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const keyGroupsTable = await queryRunner.getTable('key_groups');

    if (!keyGroupsTable) {
      return;
    }

    if (!keyGroupsTable.findColumnByName('champion_athlete_id')) {
      await queryRunner.addColumn(
        'key_groups',
        new TableColumn({
          name: 'champion_athlete_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const keyGroupsTable = await queryRunner.getTable('key_groups');

    if (!keyGroupsTable) {
      return;
    }

    if (keyGroupsTable.findColumnByName('champion_athlete_id')) {
      await queryRunner.dropColumn('key_groups', 'champion_athlete_id');
    }
  }
}
