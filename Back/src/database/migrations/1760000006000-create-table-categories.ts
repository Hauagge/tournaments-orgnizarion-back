import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateTableCategories1760000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'categories',
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
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'belt',
            type: 'varchar',
          },
          {
            name: 'age_min',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'age_max',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'weight_min_grams',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'weight_max_grams',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'total_athletes',
            type: 'int',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'categories',
      new TableForeignKey({
        columnNames: ['competition_id'],
        referencedTableName: 'competitions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'category_athletes',
        columns: [
          {
            name: 'category_id',
            type: 'int',
            isPrimary: true,
          },
          {
            name: 'athlete_id',
            type: 'int',
            isPrimary: true,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'category_athletes',
      new TableIndex({
        name: 'IDX_category_athletes_athlete_unique',
        columnNames: ['athlete_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKeys('category_athletes', [
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedTableName: 'categories',
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
    const categoryAthletes = await queryRunner.getTable('category_athletes');

    if (categoryAthletes) {
      await queryRunner.dropForeignKeys(
        'category_athletes',
        categoryAthletes.foreignKeys,
      );
      const athleteIndex = categoryAthletes.indices.find(
        (index) => index.name === 'IDX_category_athletes_athlete_unique',
      );

      if (athleteIndex) {
        await queryRunner.dropIndex('category_athletes', athleteIndex);
      }
    }

    await queryRunner.dropTable('category_athletes');

    const categories = await queryRunner.getTable('categories');

    if (categories) {
      await queryRunner.dropForeignKeys('categories', categories.foreignKeys);
    }

    await queryRunner.dropTable('categories');
  }
}
