import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import dataSource from 'ormconfig';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        ...dataSource.options,
        entities: [__dirname + '/../**/*.entity.{ts,js}'],
        synchronize: process.env.ENVIRONMENT === 'test',
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
