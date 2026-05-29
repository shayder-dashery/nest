import { Get, Post, Body, Controller, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { User } from "../models/user.model";
import { CreateUser } from "./userType";
import { AuthGuard } from "../auth/auth.guard";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @UseGuards(AuthGuard)
    @Get()
    findAll(): Promise<User[]> {
        return this.usersService.findAll()
    }

    @Post()
    create(@Body() createUser: CreateUser): Promise<User> {
        return this.usersService.create({ ...createUser })
    }
}