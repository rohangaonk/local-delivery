import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load .env manually — this file is used by the TypeORM CLI outside of the NestJS DI context
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: parseInt(process.env.DB_PORT ?? '5433', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'local_delivery',
  entities: [__dirname + '/src/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/src/database/migrations/*{.ts,.js}'],
  logging: process.env.DB_LOGGING === 'true',
});
