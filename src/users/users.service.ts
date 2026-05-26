import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { User } from "../models/user.model";
import { CreateUser } from "./userType";
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
    constructor(@InjectModel(User) private userModel: typeof User) { }

    findAll(): Promise<User[]> {
        return this.userModel.findAll()
    }

    async create(createUser: CreateUser): Promise<User> {
        const hashedPassword = await bcrypt.hash(createUser.senha, 10);
        return this.userModel.create({ ...createUser, senha: hashedPassword });
    }
}
