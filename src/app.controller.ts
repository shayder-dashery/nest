import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Página Inicial')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @ApiOperation({ summary: 'Obter mensagem de boas-vindas' })
  @ApiResponse({ status: 200, description: 'Mensagem de boas-vindas retornada com sucesso' })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
