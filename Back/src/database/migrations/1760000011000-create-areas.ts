import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAreas1760000011000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'areas',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'competition_id', type: 'int', isNullable: false },
          { name: 'name', type: 'varchar', isNullable: false },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'areas',
      new TableIndex({
        name: 'IDX_AREAS_COMPETITION_ID',
        columnNames: ['competition_id'],
      }),
    );

    await queryRunner.createIndex(
      'areas',
      new TableIndex({
        name: 'IDX_AREAS_COMPETITION_ID_NAME',
        columnNames: ['competition_id', 'name'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'areas',
      new TableForeignKey({
        name: 'FK_AREAS_COMPETITION_ID',
        columnNames: ['competition_id'],
        referencedTableName: 'competitions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'fights',
      new TableIndex({
        name: 'IDX_FIGHTS_AREA_ID',
        columnNames: ['area_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'fights',
      new TableForeignKey({
        name: 'FK_FIGHTS_AREA_ID',
        columnNames: ['area_id'],
        referencedTableName: 'areas',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_AREA_ID');
    await queryRunner.dropIndex('fights', 'IDX_FIGHTS_AREA_ID');
    await queryRunner.dropForeignKey('areas', 'FK_AREAS_COMPETITION_ID');
    await queryRunner.dropIndex('areas', 'IDX_AREAS_COMPETITION_ID_NAME');
    await queryRunner.dropIndex('areas', 'IDX_AREAS_COMPETITION_ID');
    await queryRunner.dropTable('areas');
  }
}
