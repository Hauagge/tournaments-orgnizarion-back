import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTableCategory1746320389653 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'category',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'belt_id',
            type: 'int',
          },
          {
            name: 'max_weight',
            type: 'int',
          },
          {
            name: 'min_weight',
            type: 'int',
          },
          {
            name: 'max_age',
            type: 'int',
          },
          {
            name: 'min_age',
            type: 'int',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_Belt_Category',
            columnNames: ['belt_id'],
            referencedTableName: 'belts',
            referencedColumnNames: ['id'],
          },
        ],
      }),
    );

    queryRunner.query(`
            INSERT INTO category (name, min_age, max_age, min_weight, max_weight, belt_id) VALUES ('Galo (Mirim)', 4, 6, NULL, 15, 1),
            (Mirim)', 4, 6, NULL, 15, 2),
            ('Pluma (Mirim)', 4, 6, 16, 23, 1),
            ('Pluma (Mirim)', 4, 6, 16, 23, 2),
            ('Pena (Mirim)', 4, 6, 24, 26, 1),
            ('Pena (Mirim)', 4, 6, 24, 26, 2),
            ('Leve (Mirim)', 4, 6, 27, 30, 1),
            ('Leve (Mirim)', 4, 6, 27, 30, 2),
            ('Médio (Mirim)', 4, 6, 31, 34, 1),
            ('Médio (Mirim)', 4, 6, 31, 34, 2),
            ('Meio-Pesado (Mirim)', 4, 6, 35, 38, 1),
            ('Meio-Pesado (Mirim)', 4, 6, 35, 38, 2),
            ('Pesado (Mirim)', 4, 6, 39, 46, 1),
            ('Pesado (Mirim)', 4, 6, 39, 46, 2),
            ('Super-pesado (Mirim)', 4, 6, 47, NULL, 1),
            ('Super-pesado (Mirim)', 4, 6, 47, NULL, 2),
            ('Galo (Mirim 2)', 6, 7, NULL, 18),
            ('Pluma (Mirim 2)', 6, 7, 19, 20),
            ('Pena (Mirim 2)', 6, 7, 21, 23),
            ('Leve (Mirim 2)', 6, 7, 24, 26),
            ('Médio (Mirim 2)', 6, 7, 27, 30),
            ('Meio-Pesado (Mirim 2)', 6, 7, 31, 34),
            ('Pesado (Mirim 2)', 6, 7, 35, 38),
            ('Super-pesado (Mirim 2)', 6, 7, 39, 46),
            ('Galo (Kids3)', 8, 9, NULL, 21),
            ('Pluma (Kids3)', 8, 9, 22, 24),
            ('Pena (Kids3)', 8, 9, 25, 27),
            ('Leve (Kids3)', 8, 9, 28, 30),
            ('Médio (Kids3)', 8, 9, 31, 34),
            ('Meio-Pesado (Kids3)', 8, 9, 35, 38),
            ('Pesado (Kids3)', 8, 9, 39, 42),
            ('Super-pesado (Kids3)', 8, 9, 43, 50),
            ('Pesadíssimo (Kids3)', 8, 9, 51, NULL);

            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
