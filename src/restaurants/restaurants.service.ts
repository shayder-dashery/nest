import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Restaurant } from '../models/restaurant.model';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant)
    private restaurantModel: typeof Restaurant,
  ) {}

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantModel.findAll({ where: { ativo: true } });
  }

  async findOne(id: number): Promise<Restaurant> {
    const restaurant = await this.restaurantModel.findByPk(id);
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado');
    return restaurant;
  }

  async create(
    createDto: CreateRestaurantDto,
    userId: number,
  ): Promise<Restaurant> {
    return this.restaurantModel.create({ ...createDto, userId });
  }

  async update(
    id: number,
    updateDto: UpdateRestaurantDto,
    userId: number,
  ): Promise<Restaurant> {
    const restaurant = await this.findOne(id);

    // Garante que apenas o dono do restaurante pode editar
    if (restaurant.userId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este restaurante',
      );
    }

    await restaurant.update(updateDto);
    return restaurant;
  }

  async remove(id: number, userId: number): Promise<void> {
    const restaurant = await this.findOne(id);
    if (restaurant.userId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir este restaurante',
      );
    }
    await restaurant.destroy();
  }
}