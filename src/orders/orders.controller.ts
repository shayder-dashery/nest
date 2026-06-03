import { Controller, Get, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Pedidos')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Listar pedidos com paginação' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos paginada.' })
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.ordersService.findAll(pagination);
  }
}
