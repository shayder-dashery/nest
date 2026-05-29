import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '../models/user.model';
import { LoginService } from './login.service';
import { LoginController } from './login.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'jwtsegura',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [LoginService],
  controllers: [LoginController],
  exports: [LoginService],
})
export class LoginModule {}
