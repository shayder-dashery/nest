import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { User } from "../models/user.model";
import { LoginService } from "./login.service";
import { LoginController } from "./login.controller";

@Module({
    imports: [SequelizeModule.forFeature([User])],
    providers: [LoginService],
    controllers: [LoginController],
    exports: [LoginService]
})
export class LoginModule { }