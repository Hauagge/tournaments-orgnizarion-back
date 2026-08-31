import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFightLoserRouting1760000027000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const fightsTable = await queryRunner.getTable('fights');

    if (!fightsTable) {
      return;
    }

    if (!fightsTable.findColumnByName('loser_next_fight_id')) {
      await queryRunner.addColumn(
        'fights',
        new TableColumn({
          name: 'loser_next_fight_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    if (!fightsTable.findColumnByName('loser_next_fight_slot')) {
      await queryRunner.addColumn(
        'fights',
        new TableColumn({
          name: 'loser_next_fight_slot',
          type: 'varchar',
          length: '1',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const fightsTable = await queryRunner.getTable('fights');

    if (!fightsTable) {
      return;
    }

    if (fightsTable.findColumnByName('loser_next_fight_slot')) {
      await queryRunner.dropColumn('fights', 'loser_next_fight_slot');
    }

    if (fightsTable.findColumnByName('loser_next_fight_id')) {
      await queryRunner.dropColumn('fights', 'loser_next_fight_id');
    }
  }
}
