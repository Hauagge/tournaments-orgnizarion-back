import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyTypeOrmEntity } from './infra/persistence/entities/academy.typeorm-entity';
import { AcademyRepository } from './infra/persistence/academy.repository';
import { IAcademyRepository } from './repository/IAcademyRepository.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AcademyTypeOrmEntity])],
  providers: [
    {
      provide: IAcademyRepository,
      useClass: AcademyRepository,
    },
  ],
  exports: [IAcademyRepository],
})
export class AcademyProviderModule {}
