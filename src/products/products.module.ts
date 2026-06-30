import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Product } from '../models/product.model';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Restaurant } from '../models/restaurant.model';

@Module({
  imports: [SequelizeModule.forFeature([Product, Restaurant])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}