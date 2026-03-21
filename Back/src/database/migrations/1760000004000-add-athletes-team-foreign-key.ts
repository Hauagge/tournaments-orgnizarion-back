import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddAthletesTeamForeignKey1760000004000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'athletes',
      new TableIndex({
        name: 'IDX_ATHLETES_TEAM_ID',
        columnNames: ['team_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'athletes',
      new TableForeignKey({
        name: 'FK_ATHLETES_TEAM_ID',
        columnNames: ['team_id'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('athletes', 'FK_ATHLETES_TEAM_ID');
    await queryRunner.dropIndex('athletes', 'IDX_ATHLETES_TEAM_ID');
  }
}
