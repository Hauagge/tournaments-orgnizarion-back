import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.typeorm-entity';
import { UserRepository } from './user.repository';
import { IUserRepository } from './repository/IUserRepository.repository';
import { IPasswordHasher } from './services/IPasswordHasher.service';
import { PasswordHasherService } from './services/password-hasher.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: IUserRepository,
      useClass: UserRepository,
    },
    {
      provide: IPasswordHasher,
      useClass: PasswordHasherService,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
