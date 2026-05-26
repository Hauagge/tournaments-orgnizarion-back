import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCategoryBeltMergeFields1760000021000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const categoriesTable = await queryRunner.getTable('categories');

    if (!categoriesTable) {
      return;
    }

    if (!categoriesTable.findColumnByName('allow_merge')) {
      await queryRunner.addColumn(
        'categories',
        new TableColumn({
          name: 'allow_merge',
          type: 'boolean',
          default: false,
        }),
      );
    }

    if (!categoriesTable.findColumnByName('merge_with_belt')) {
      await queryRunner.addColumn(
        'categories',
        new TableColumn({
          name: 'merge_with_belt',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const categoriesTable = await queryRunner.getTable('categories');

    if (!categoriesTable) {
      return;
    }

    if (categoriesTable.findColumnByName('merge_with_belt')) {
      await queryRunner.dropColumn('categories', 'merge_with_belt');
    }

    if (categoriesTable.findColumnByName('allow_merge')) {
      await queryRunner.dropColumn('categories', 'allow_merge');
    }
  }
}
