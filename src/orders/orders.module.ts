import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SequelizeModule } from '@nestjs/sequelize';
import { Order } from '../models/order.model';
import { OrderItem } from '../models/order-item.model';
import { Product } from '../models/product.model';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderEventsProcessor } from './order-events.processor';
import { ORDER_EVENTS_QUEUE } from '../queues/queue-names';
import { isQueueEnabled } from '../queues/redis-connection';

const queueEnabled = isQueueEnabled();

@Module({
  imports: [
    SequelizeModule.forFeature([Order, OrderItem, Product]),
    ...(queueEnabled ? [BullModule.registerQueue({ name: ORDER_EVENTS_QUEUE })] : []),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    ...(queueEnabled ? [OrderEventsProcessor] : []),
  ],
})
export class OrdersModule {}
