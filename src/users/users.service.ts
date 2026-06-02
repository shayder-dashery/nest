import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { User } from "../models/user.model";
import { CreateUserDto } from "./dto/create-user.dto";
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
    constructor(@InjectModel(User) private userModel: typeof User) { }

    findAll(): Promise<User[]> {
        return this.userModel.findAll()
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const hashedPassword = await bcrypt.hash(createUserDto.senha, 10);
        return this.userModel.create({ ...createUserDto, senha: hashedPassword });
    }
}
