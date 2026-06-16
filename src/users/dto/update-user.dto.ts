import { PartialType } from '@nestjs/swagger'; // ou '@nestjs/mapped-types'
import { CreateUserDto } from './create-user.dto';

// PartialType torna todos os campos do CreateUserDto opcionais
export class UpdateUserDto extends PartialType(CreateUserDto) {}