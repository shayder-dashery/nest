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
import { QueuesModule } from './queues/queues.module';

const isPostgres = process.env.DB_DIALECT === 'postgres' || !!process.env.DATABASE_URL;

const databaseConfig = isPostgres
  ? {
      dialect: 'postgres' as const,
      url: process.env.DATABASE_URL,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      dialectOptions:
        process.env.DB_SSL === 'true'
          ? {
              ssl: {
                require: true,
                rejectUnauthorized: false,
              },
            }
          : undefined,
    }
  : {
      dialect: 'sqlite' as const,
      storage: process.env.SQLITE_STORAGE ?? './database.sqlite',
    };

@Module({
  imports: [
    QueuesModule,
    SequelizeModule.forRoot({
      ...databaseConfig,
      autoLoadModels: true,
      synchronize: process.env.DB_SYNC !== 'false',
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