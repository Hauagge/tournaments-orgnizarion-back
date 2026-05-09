import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './infra/guards/jwt-auth.guard';
import { RolesGuard } from './infra/guards/roles.guard';
import { JwtTokenService } from './infra/services/jwt-token.service';

@Global()
@Module({
  providers: [JwtTokenService, JwtAuthGuard, RolesGuard],
  exports: [JwtTokenService, JwtAuthGuard, RolesGuard],
})
export class CoreAuthModule {}
