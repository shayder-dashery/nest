import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/userType';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@ApiTags('Restaurantes')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  findAll() {
    return this.restaurantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(+id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  create(@Body() createDto: CreateRestaurantDto, @Request() req) {
    return this.restaurantsService.create(createDto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRestaurantDto,
    @Request() req,
  ) {
    return this.restaurantsService.update(+id, updateDto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.restaurantsService.remove(+id, req.user.sub);
  }
}