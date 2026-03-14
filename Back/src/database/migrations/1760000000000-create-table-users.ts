import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTableUsers1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'username',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password_hash',
            type: 'varchar',
          },
          {
            name: 'role',
            type: 'varchar',
          },
        ],
        checks: [
          {
            name: 'CHK_users_role',
            expression:
              "role IN ('staff', 'desk', 'public', 'organization')",
          },
        ],
      }),
    );

    await queryRunner.query(`
      INSERT INTO users (username, password_hash, role)
      VALUES
        ('staff', '466fe34ea39caf766004444fcd2d09c4:da04a27123c4b906f209c06f0ce730f54abea9185e84d4c2a8d2ed19b616515b', 'staff'),
        ('mesa', '7f16c32aaa9867d73be98e4f224442ec:96582a62678d0f1b361cd416016b888ee35d5015c1c7e7848c277bfd651cf116', 'desk'),
        ('publico', 'af873e240a1d8603cb7784b1fcef54ec:27edc6562f4e805e94079fd7b766fd24853d4056cd7bc121c83643451dfe5e30', 'public'),
        ('organizacao', 'bf00e959a9420cd163101e12d5cdfc78:ad7c0bb2bea908a5e218b1f3e13054dd9fca27feb0b7cfff95b4477774102f79', 'organization')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
