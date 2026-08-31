import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAthleteGender1760000025000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const athletesTable = await queryRunner.getTable('athletes');

    if (!athletesTable) {
      return;
    }

    if (!athletesTable.findColumnByName('gender')) {
      await queryRunner.addColumn(
        'athletes',
        new TableColumn({
          name: 'gender',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const athletesTable = await queryRunner.getTable('athletes');

    if (!athletesTable) {
      return;
    }

    if (athletesTable.findColumnByName('gender')) {
      await queryRunner.dropColumn('athletes', 'gender');
    }
  }
}
