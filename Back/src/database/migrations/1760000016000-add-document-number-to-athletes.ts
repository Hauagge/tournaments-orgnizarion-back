import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDocumentNumberToAthletes1760000016000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'athletes',
      new TableColumn({
        name: 'document_number',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('athletes', 'document_number');
  }
}
