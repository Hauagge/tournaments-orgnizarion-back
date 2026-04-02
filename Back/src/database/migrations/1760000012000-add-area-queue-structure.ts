import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddAreaQueueStructure1760000012000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'areas',
      new TableColumn({
        name: 'order',
        type: 'int',
        isNullable: false,
        default: 1,
      }),
    );

    await queryRunner.query('UPDATE areas SET "order" = id WHERE "order" = 1');

    await queryRunner.createIndex(
      'areas',
      new TableIndex({
        name: 'IDX_AREAS_COMPETITION_ID_ORDER',
        columnNames: ['competition_id', 'order'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'area_queue_items',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'area_id', type: 'int', isNullable: false },
          { name: 'fight_id', type: 'int', isNullable: false },
          { name: 'position', type: 'int', isNullable: false },
          { name: 'status', type: 'varchar', isNullable: false },
        ],
      }),
    );

    await queryRunner.createIndex(
      'area_queue_items',
      new TableIndex({
        name: 'IDX_AREA_QUEUE_ITEMS_AREA_ID_POSITION',
        columnNames: ['area_id', 'position'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'area_queue_items',
      new TableIndex({
        name: 'IDX_AREA_QUEUE_ITEMS_FIGHT_ID',
        columnNames: ['fight_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'area_queue_items',
      new TableForeignKey({
        name: 'FK_AREA_QUEUE_ITEMS_AREA_ID',
        columnNames: ['area_id'],
        referencedTableName: 'areas',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'area_queue_items',
      new TableForeignKey({
        name: 'FK_AREA_QUEUE_ITEMS_FIGHT_ID',
        columnNames: ['fight_id'],
        referencedTableName: 'fights',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('area_queue_items', 'FK_AREA_QUEUE_ITEMS_FIGHT_ID');
    await queryRunner.dropForeignKey('area_queue_items', 'FK_AREA_QUEUE_ITEMS_AREA_ID');
    await queryRunner.dropIndex('area_queue_items', 'IDX_AREA_QUEUE_ITEMS_FIGHT_ID');
    await queryRunner.dropIndex('area_queue_items', 'IDX_AREA_QUEUE_ITEMS_AREA_ID_POSITION');
    await queryRunner.dropTable('area_queue_items');
    await queryRunner.dropIndex('areas', 'IDX_AREAS_COMPETITION_ID_ORDER');
    await queryRunner.dropColumn('areas', 'order');
  }
}
