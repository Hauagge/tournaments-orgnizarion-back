import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateTableWeighIns1760000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'weigh_ins',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'competition_id',
            type: 'int',
          },
          {
            name: 'athlete_id',
            type: 'int',
          },
          {
            name: 'measured_weight_grams',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
          },
          {
            name: 'performed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'performed_by',
            type: 'varchar',
            isNullable: true,
          },
        ],
        checks: [
          {
            name: 'CHK_weigh_ins_status',
            expression: "status IN ('PENDING', 'APPROVED', 'REJECTED')",
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'weigh_ins',
      new TableIndex({
        name: 'IDX_weigh_ins_competition_athlete_unique',
        columnNames: ['competition_id', 'athlete_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKeys('weigh_ins', [
      new TableForeignKey({
        columnNames: ['competition_id'],
        referencedTableName: 'competitions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['athlete_id'],
        referencedTableName: 'athletes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('weigh_ins');

    if (table) {
      await queryRunner.dropForeignKeys('weigh_ins', table.foreignKeys);
      const uniqueIndex = table.indices.find(
        (index) => index.name === 'IDX_weigh_ins_competition_athlete_unique',
      );

      if (uniqueIndex) {
        await queryRunner.dropIndex('weigh_ins', uniqueIndex);
      }
    }

    await queryRunner.dropTable('weigh_ins');
  }
}
