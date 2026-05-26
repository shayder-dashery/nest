import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import { User } from "../models/user.model";

@Injectable()
export class LoginService {
    constructor(@InjectModel(User) private userModel: typeof User) { }

    async login(email: string, password: string): Promise<{ message: string, status: string, user: { id: number, email: string } }> {

        const findOneByEmail = async (email: string): Promise<User | null> => {
            return this.userModel.findOne({ where: { email } });
        }

        const user = await findOneByEmail(email);
        if (!user) {
            throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(password, user.senha);
        if (!isPasswordValid) {
            throw new Error("Invalid password");
        }

        return { message: "Login successful", status: "success", user: { id: user.id, email: user.email } };

    }
}