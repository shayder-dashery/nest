import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { LoginService } from './login.service';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Login')
@Controller('login')
export class LoginController {
  constructor(private loginService: LoginService) { }

  @ApiOperation({ summary: 'Realizar login' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })

  @Post()
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto): Promise<{
    message: string;
    status: string;
    access_token: string;
  }> {
    const { email, password } = body;
    return this.loginService.login({ email, password });
  }
}
