import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { DataSource } from 'typeorm'

@Injectable()
export class TypeOrmService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize()
        console.log('TypeORM DataSource initialized')
      }
    } catch (error) {
      console.error('Error during TypeORM DataSource initialization', error)
      throw error
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy()
      console.log('TypeORM DataSource destroyed')
    }
  }
}
