import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWeighInAuditFields1760000023000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('weigh_ins');

    if (table && !table.findColumnByName('performed_by_id')) {
      await queryRunner.addColumn(
        'weigh_ins',
        new TableColumn({
          name: 'performed_by_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    if (table && !table.findColumnByName('observation')) {
      await queryRunner.addColumn(
        'weigh_ins',
        new TableColumn({
          name: 'observation',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('weigh_ins');

    if (table?.findColumnByName('observation')) {
      await queryRunner.dropColumn('weigh_ins', 'observation');
    }

    if (table?.findColumnByName('performed_by_id')) {
      await queryRunner.dropColumn('weigh_ins', 'performed_by_id');
    }
  }
}
