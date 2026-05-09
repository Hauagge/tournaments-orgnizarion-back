import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { Public } from '@/core/auth/infra/decorators/public.decorator';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { AuthService } from './auth.service';
import { LoginDto, LoginSchema } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @UsePipes(new ZodValidationPipe(LoginSchema))
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }
}
