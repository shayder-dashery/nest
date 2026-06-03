import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { UsersModule } from './users/users.module';
import { LoginModule } from './login/login.module';
import { Restaurant } from './models/restaurant.model';
import { Product } from './models/product.model';
import { Order } from './models/order.model';
import { OrderItem } from './models/order-item.model';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';


@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'sqlite',
      storage: './database.sqlite',
      autoLoadModels: true,
      synchronize: true,
      models: [User, Restaurant, Product, Order, OrderItem],
    }),
    UsersModule,
    LoginModule,
    RestaurantsModule,
    ProductsModule,
    OrdersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}