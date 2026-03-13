import { config } from 'dotenv';

import { DataSource } from 'typeorm';
import { createEnvironment } from './src/configuration/environment.config';
import * as z from 'zod';
import { DatabaseEnvironmentSchema } from '@/database/schema/database-environment.schema';

config({ path: '.env' });
const env = createEnvironment(z.object(DatabaseEnvironmentSchema));

const dataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  migrations: [__dirname + '/src/database/migrations/*.{ts,js}'],
  synchronize: false,
  logging: true,
  ssl: false,
});

export default dataSource as DataSource;
