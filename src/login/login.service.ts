import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { User } from '../models/user.model';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class LoginService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    private jwtService: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{
    message: string;
    status: string;
    access_token: string;
  }> {
    const findOneByEmail = async (email: string): Promise<User | null> => {
      return this.userModel.findOne({ where: { email } });
    };

    const user = await findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.senha);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const payload = { id: user.id, email: user.email };
    return {
      message: 'Login successful',
      status: 'success',
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
