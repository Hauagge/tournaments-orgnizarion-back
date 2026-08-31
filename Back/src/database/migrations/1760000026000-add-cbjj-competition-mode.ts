import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCbjjCompetitionMode1760000026000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE competitions DROP CONSTRAINT IF EXISTS "CHK_competitions_mode"',
    );
    await queryRunner.query(
      `ALTER TABLE competitions ADD CONSTRAINT "CHK_competitions_mode" CHECK (mode IN ('KEYS', 'ABSOLUTE_GP', 'CBJJ'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE competitions SET mode = 'KEYS' WHERE mode = 'CBJJ'`,
    );
    await queryRunner.query(
      'ALTER TABLE competitions DROP CONSTRAINT IF EXISTS "CHK_competitions_mode"',
    );
    await queryRunner.query(
      `ALTER TABLE competitions ADD CONSTRAINT "CHK_competitions_mode" CHECK (mode IN ('KEYS', 'ABSOLUTE_GP'))`,
    );
  }
}
