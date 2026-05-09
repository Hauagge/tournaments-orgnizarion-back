import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.typeorm-entity';
import { UserCompetitionTypeOrmEntity } from './entities/user-competition.typeorm-entity';
import { UserRepository } from './user.repository';
import { IUserRepository } from './repository/IUserRepository.repository';
import { IUserCompetitionRepository } from './repository/IUserCompetitionRepository.repository';
import { IPasswordHasher } from './services/IPasswordHasher.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { UserCompetitionRepository } from './user-competition.repository';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCompetitionTypeOrmEntity])],
  controllers: [AuthController, UserController],
  providers: [
    AuthService,
    ListUsersUseCase,
    {
      provide: IUserRepository,
      useClass: UserRepository,
    },
    {
      provide: IPasswordHasher,
      useClass: PasswordHasherService,
    },
    {
      provide: IUserCompetitionRepository,
      useClass: UserCompetitionRepository,
    },
  ],
  exports: [AuthService, IUserRepository, IUserCompetitionRepository],
})
export class AuthModule {}
