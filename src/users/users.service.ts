import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { User } from "src/models/user.model";
import { CreateUser } from "./userType";

@Injectable()
export class UsersService {
    constructor(@InjectModel(User) private userModel: typeof User) { }

    findAll(): Promise<User[]> {
        return this.userModel.findAll()
    }

    create(createUser: CreateUser): Promise<User> {
        return this.userModel.create({ ...createUser })
    }
}
