import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTableBelt1746279133755 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'belts',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'color',
            type: 'varchar',
          },
        ],
      }),
    );

    await queryRunner.query(`
      INSERT INTO belts (color) VALUES
      ('Branca'),
      ('Cinza'),
      ('Amarela'),
      ('Laranja'),
      ('Verde'),
      ('Azul'),
      ('Roxa'),
      ('Marrom'),
      ('Preta')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('belts');
  }
}
