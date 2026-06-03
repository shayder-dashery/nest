import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Product } from '../models/product.model';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Restaurant } from '../models/restaurant.model';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product)
    private productModel: typeof Product,
    @InjectModel(Restaurant)
    private restaurantModel: typeof Restaurant,
  ) {}

  async findAllByRestaurant(restaurantId: number): Promise<Product[]> {
    return this.productModel.findAll({
      where: { restaurantId, disponivel: true },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productModel.findByPk(id);
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async create(createDto: CreateProductDto, userId: number): Promise<Product> {
    const restaurant = await this.restaurantModel.findByPk(
      createDto.restaurantId,
    );
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado');
    if (restaurant.userId !== userId) {
      throw new ForbiddenException('Você não é o dono deste restaurante');
    }
    return this.productModel.create({ ...createDto });
  }

  async update(
    id: number,
    updateDto: UpdateProductDto,
    restaurantId: number,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (product.restaurantId !== restaurantId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este produto',
      );
    }

    await product.update(updateDto);
    return product;
  }

  async remove(id: number, restaurantId: number): Promise<void> {
    const product = await this.findOne(id);
    if (product.restaurantId !== restaurantId) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir este produto',
      );
    }
    await product.destroy();
  }
}
