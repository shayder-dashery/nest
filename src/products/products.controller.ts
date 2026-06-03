import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/userType';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Produtos')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Listar produtos de um restaurante' })
  @ApiResponse({ status: 200, description: 'Lista de produtos.' })
  @Get('restaurant/:restaurantId')
  findAllByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.productsService.findAllByRestaurant(+restaurantId);
  }

  @ApiOperation({ summary: 'Obter detalhes de um produto' })
  @ApiResponse({ status: 200, description: 'Detalhes do produto.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Criar um novo produto' })
  @ApiResponse({ status: 201, description: 'Produto criado.' })
  @Post()
  create(@Body() createDto: CreateProductDto, @Request() req) {
    return this.productsService.create(createDto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Atualizar um produto existente' })
  @ApiResponse({ status: 200, description: 'Produto atualizado.' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductDto,
    @Request() req,
  ) {
    return this.productsService.update(+id, updateDto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Excluir um produto' })
  @ApiResponse({ status: 204, description: 'Produto excluído.' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.productsService.remove(+id, req.user.sub);
  }
}