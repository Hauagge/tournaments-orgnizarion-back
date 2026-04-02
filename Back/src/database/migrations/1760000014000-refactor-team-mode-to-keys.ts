import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class RefactorTeamModeToKeys1760000014000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE competitions SET mode = 'KEYS' WHERE mode = 'TEAM'`);

    await queryRunner.query(
      'ALTER TABLE competitions DROP CONSTRAINT IF EXISTS "CHK_competitions_mode"',
    );
    await queryRunner.createCheckConstraint(
      'competitions',
      new TableCheck({
        name: 'CHK_competitions_mode',
        expression: "mode IN ('KEYS', 'ABSOLUTE_GP')",
      }),
    );

    const fightsTable = await queryRunner.getTable('fights');
    const hasKeyGroupId = fightsTable?.findColumnByName('key_group_id');

    if (!hasKeyGroupId) {
      await queryRunner.addColumn(
        'fights',
        new TableColumn({
          name: 'key_group_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    await queryRunner.createTable(
      new Table({
        name: 'key_groups',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'competition_id', type: 'int', isNullable: false },
          { name: 'category_id', type: 'int', isNullable: true },
          { name: 'name', type: 'varchar', isNullable: true },
          { name: 'status', type: 'varchar', isNullable: false },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'key_groups',
      new TableIndex({
        name: 'IDX_KEY_GROUPS_COMPETITION_ID_CATEGORY_ID',
        columnNames: ['competition_id', 'category_id'],
      }),
    );

    await queryRunner.createForeignKeys('key_groups', [
      new TableForeignKey({
        name: 'FK_KEY_GROUPS_COMPETITION_ID',
        columnNames: ['competition_id'],
        referencedTableName: 'competitions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_KEY_GROUPS_CATEGORY_ID',
        columnNames: ['category_id'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'key_group_members',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'key_group_id', type: 'int', isNullable: false },
          { name: 'athlete_id', type: 'int', isNullable: false },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'key_group_members',
      new TableIndex({
        name: 'IDX_KEY_GROUP_MEMBERS_KEY_GROUP_ID_ATHLETE_ID',
        columnNames: ['key_group_id', 'athlete_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKeys('key_group_members', [
      new TableForeignKey({
        name: 'FK_KEY_GROUP_MEMBERS_KEY_GROUP_ID',
        columnNames: ['key_group_id'],
        referencedTableName: 'key_groups',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_KEY_GROUP_MEMBERS_ATHLETE_ID',
        columnNames: ['athlete_id'],
        referencedTableName: 'athletes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      'fights',
      new TableIndex({
        name: 'IDX_FIGHTS_KEY_GROUP_ID',
        columnNames: ['key_group_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'fights',
      new TableForeignKey({
        name: 'FK_FIGHTS_KEY_GROUP_ID',
        columnNames: ['key_group_id'],
        referencedTableName: 'key_groups',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('fights', 'FK_FIGHTS_KEY_GROUP_ID');
    await queryRunner.dropIndex('fights', 'IDX_FIGHTS_KEY_GROUP_ID');

    await queryRunner.dropForeignKey('key_group_members', 'FK_KEY_GROUP_MEMBERS_ATHLETE_ID');
    await queryRunner.dropForeignKey('key_group_members', 'FK_KEY_GROUP_MEMBERS_KEY_GROUP_ID');
    await queryRunner.dropIndex(
      'key_group_members',
      'IDX_KEY_GROUP_MEMBERS_KEY_GROUP_ID_ATHLETE_ID',
    );
    await queryRunner.dropTable('key_group_members');

    await queryRunner.dropForeignKey('key_groups', 'FK_KEY_GROUPS_CATEGORY_ID');
    await queryRunner.dropForeignKey('key_groups', 'FK_KEY_GROUPS_COMPETITION_ID');
    await queryRunner.dropIndex(
      'key_groups',
      'IDX_KEY_GROUPS_COMPETITION_ID_CATEGORY_ID',
    );
    await queryRunner.dropTable('key_groups');

    const fightsTable = await queryRunner.getTable('fights');
    if (fightsTable?.findColumnByName('key_group_id')) {
      await queryRunner.dropColumn('fights', 'key_group_id');
    }

    await queryRunner.query(
      'ALTER TABLE competitions DROP CONSTRAINT IF EXISTS "CHK_competitions_mode"',
    );
    await queryRunner.createCheckConstraint(
      'competitions',
      new TableCheck({
        name: 'CHK_competitions_mode',
        expression: "mode IN ('TEAM', 'ABSOLUTE_GP')",
      }),
    );

    await queryRunner.query(`UPDATE competitions SET mode = 'TEAM' WHERE mode = 'KEYS'`);
  }
}
