import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { UsersModule } from './users/users.module';
import { LoginModule } from './login/login.module';

@Module({
  imports: [
    SequelizeModule.forRoot({
        dialect: 'sqlite',
        storage: './database.sqlite',
        autoLoadModels: true,
        synchronize: true,
        models: [User]
    }),
    UsersModule,
    LoginModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
