import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPaymentStatusToAthletes1760000017000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const athletesTable = await queryRunner.getTable('athletes');

    if (!athletesTable) {
      return;
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'athlete_payment_status_enum'
        ) THEN
          CREATE TYPE athlete_payment_status_enum AS ENUM ('PAID', 'PENDING', 'EXEMPT');
        END IF;
      END
      $$;
    `);

    if (!athletesTable.findColumnByName('payment_status')) {
      await queryRunner.addColumn(
        'athletes',
        new TableColumn({
          name: 'payment_status',
          type: 'enum',
          enumName: 'athlete_payment_status_enum',
          enum: ['PAID', 'PENDING', 'EXEMPT'],
          default: `'PENDING'`,
          isNullable: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const athletesTable = await queryRunner.getTable('athletes');

    if (athletesTable?.findColumnByName('payment_status')) {
      await queryRunner.dropColumn('athletes', 'payment_status');
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'athlete_payment_status_enum'
        ) THEN
          DROP TYPE athlete_payment_status_enum;
        END IF;
      END
      $$;
    `);
  }
}
