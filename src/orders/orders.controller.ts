import { Controller, Get, Query, Patch, Body, Param, UseGuards, Request, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderStatus } from './order-status.enum';
import { UserRole } from '../users/userType';
import { AuthGuard } from '../auth/auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';

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

  @ApiOperation({ summary: 'Obter detalhes de um pedido' })
  @ApiResponse({ status: 200, description: 'Detalhes do pedido.' })
  @Get(':id')
  findOne(@Query('id') id: number) {
    return this.ordersService.findOne(id);
  }

  @ApiOperation({ summary: 'Atualizar status de um pedido' })
  @ApiResponse({ status: 200, description: 'Status do pedido atualizado.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('newStatus') newStatus: OrderStatus,
    @Request() req,
  ) {
    return this.ordersService.updateStatus(
      +id,
      newStatus,
      req.user.sub,
      req.user.role,
    );
  }

  @ApiOperation({ summary: 'Criar um novo pedido' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.ordersService.create(createOrderDto, req.user.sub);
  }

  @ApiOperation({ summary: 'Cancelar um pedido' })
  @ApiResponse({ status: 200, description: 'Pedido cancelado com sucesso.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.cancelOrder(+id, req.user.sub);
  }

  @ApiOperation({ summary: 'Listar pedidos de um restaurante' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos do restaurante.' })
  @Get('restaurant/:id')
  findByRestaurant(
    @Param('id') id: string,
    @Query('status') status?: OrderStatus,
    @Query() pagination?: PaginationDto,
  ) {
    return this.ordersService.findByRestaurant(+id, status, pagination);
  }

  @ApiOperation({ summary: 'Listar meus pedidos' })
  @ApiResponse({ status: 200, description: 'Sua lista de pedidos.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('customer')
  findByCustomer(
    @Request() req,
    @Query() pagination: PaginationDto,
    @Query('status') status?: OrderStatus) {
    return this.ordersService.findByCustomer(req.user.sub, pagination, status);
  }

  @ApiOperation({ summary: 'Listar pedidos de um cliente' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos do cliente.' })
  @Get('customer/:id')
  findByCustomerId(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: OrderStatus) {
    return this.ordersService.findByCustomer(+id, pagination, status);
    }
}
