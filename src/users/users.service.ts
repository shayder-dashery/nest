import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { User } from "../models/user.model";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
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
    async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await User.findByPk(id);
        if (!user) throw new NotFoundException('Usuário não encontrado');

        if (updateUserDto.senha) {
            updateUserDto.senha = await bcrypt.hash(updateUserDto.senha, 10);
        }

        await user.update(updateUserDto);
        return user;
    }

    async remove(id: number): Promise<void> {
        const user = await User.findByPk(id);
        if (!user) throw new NotFoundException('Usuário não encontrado');

        await user.destroy(); // soft delete se o model tiver o campo deletedAt
    }
}