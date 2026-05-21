import { Get, Post, Body, Controller } from "@nestjs/common";
import { UsersService } from "./users.service";
import { User } from "src/models/user.model";
import { CreateUser } from "./userType";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    findAll(): Promise<User[]> {
        return this.usersService.findAll()
    }

    @Post()
    create(@Body() createUser: CreateUser): Promise<User> {
        return this.usersService.create({ ...createUser })
    }
}