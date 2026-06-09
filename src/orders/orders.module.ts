import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Order } from '../models/order.model';
import { OrderItem } from '../models/order-item.model';
import { Product } from '../models/product.model';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [SequelizeModule.forFeature([Order, OrderItem, Product]), GatewaysModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
