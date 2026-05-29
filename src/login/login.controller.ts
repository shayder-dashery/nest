import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { LoginService } from './login.service';

@Controller('login')
export class LoginController {
  constructor(private loginService: LoginService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }): Promise<{
    message: string;
    status: string;
    access_token: string;
  }> {
    const { email, password } = body;
    return this.loginService.login(email, password);
  }
}
