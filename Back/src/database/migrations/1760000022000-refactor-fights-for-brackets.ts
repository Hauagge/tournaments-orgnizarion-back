import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class RefactorFightsForBrackets1760000022000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE fights SET status = 'PENDING' WHERE status = 'WAITING'",
    );

    const fightsTable = await queryRunner.getTable('fights');
    const categoriesTable = await queryRunner.getTable('categories');

    if (fightsTable && !fightsTable.findColumnByName('round_number')) {
      await queryRunner.addColumn(
        'fights',
        new TableColumn({
          name: 'round_number',
          type: 'int',
          default: 1,
          isNullable: false,
        }),
      );
    }

    if (fightsTable?.findColumnByName('athlete_a_id')?.isNullable === false) {
      await queryRunner.changeColumn(
        'fights',
        'athlete_a_id',
        new TableColumn({
          name: 'athlete_a_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    if (fightsTable?.findColumnByName('athlete_b_id')?.isNullable === false) {
      await queryRunner.changeColumn(
        'fights',
        'athlete_b_id',
        new TableColumn({
          name: 'athlete_b_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    const newFightColumns = [
      ['loser_athlete_id', 'int'],
      ['next_fight_id', 'int'],
      ['next_fight_slot', 'varchar'],
      ['created_manually', 'boolean'],
      ['is_wo', 'boolean'],
      ['created_at', 'timestamp'],
      ['updated_at', 'timestamp'],
    ] as const;

    for (const [name, type] of newFightColumns) {
      if (!fightsTable?.findColumnByName(name)) {
        await queryRunner.addColumn(
          'fights',
          new TableColumn({
            name,
            type,
            isNullable:
              name === 'loser_athlete_id' ||
              name === 'next_fight_id' ||
              name === 'next_fight_slot',
            default:
              name === 'created_manually'
                ? false
                : name === 'is_wo'
                  ? false
                  : name === 'created_at' || name === 'updated_at'
                    ? 'CURRENT_TIMESTAMP'
                    : undefined,
            length: name === 'next_fight_slot' ? '1' : undefined,
          }),
        );
      }
    }

    if (!fightsTable?.foreignKeys.some((fk) => fk.name === 'FK_FIGHTS_NEXT_FIGHT_ID')) {
      await queryRunner.createForeignKey(
        'fights',
        new TableForeignKey({
          name: 'FK_FIGHTS_NEXT_FIGHT_ID',
          columnNames: ['next_fight_id'],
          referencedTableName: 'fights',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        }),
      );
    }

    if (!fightsTable?.indices.some((idx) => idx.name === 'IDX_FIGHTS_NEXT_FIGHT_ID')) {
      await queryRunner.createIndex(
        'fights',
        new TableIndex({
          name: 'IDX_FIGHTS_NEXT_FIGHT_ID',
          columnNames: ['next_fight_id'],
        }),
      );
    }

    if (categoriesTable && !categoriesTable.findColumnByName('champion_athlete_id')) {
      await queryRunner.addColumn(
        'categories',
        new TableColumn({
          name: 'champion_athlete_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    if (categoriesTable && !categoriesTable.findColumnByName('updated_at')) {
      await queryRunner.addColumn(
        'categories',
        new TableColumn({
          name: 'updated_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const fightsTable = await queryRunner.getTable('fights');
    const categoriesTable = await queryRunner.getTable('categories');

    if (fightsTable?.indices.some((idx) => idx.name === 'IDX_FIGHTS_NEXT_FIGHT_ID')) {
      await queryRunner.dropIndex('fights', 'IDX_FIGHTS_NEXT_FIGHT_ID');
    }

    if (fightsTable?.foreignKeys.some((fk) => fk.name === 'FK_FIGHTS_NEXT_FIGHT_ID')) {
      await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_NEXT_FIGHT_ID');
    }

    for (const name of [
      'updated_at',
      'created_at',
      'is_wo',
      'created_manually',
      'next_fight_slot',
      'next_fight_id',
      'loser_athlete_id',
      'round_number',
    ]) {
      if (fightsTable?.findColumnByName(name)) {
        await queryRunner.dropColumn('fights', name);
      }
    }

    if (categoriesTable?.findColumnByName('champion_athlete_id')) {
      await queryRunner.dropColumn('categories', 'champion_athlete_id');
    }

    if (categoriesTable?.findColumnByName('updated_at')) {
      await queryRunner.dropColumn('categories', 'updated_at');
    }

    await queryRunner.query(
      "UPDATE fights SET status = 'WAITING' WHERE status = 'PENDING'",
    );
  }
}
