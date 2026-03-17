import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTableAthletes1760000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'athletes',
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
            name: 'full_name',
            type: 'varchar',
          },
          {
            name: 'birth_date',
            type: 'date',
          },
          {
            name: 'belt',
            type: 'varchar',
          },
          {
            name: 'declared_weight_grams',
            type: 'int',
          },
          {
            name: 'team_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('athletes');
  }
}
