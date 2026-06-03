import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Pizzaria do João' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'Rua das Flores, 123' })
  @IsString()
  @IsNotEmpty()
  endereco: string;

  @ApiProperty({ example: '(11) 99999-9999' })
  @IsString()
  @IsNotEmpty()
  telefone: string;

  @ApiProperty({ example: 'As melhores pizzas da cidade', required: false })
  @IsString()
  @IsOptional()
  descricao?: string;
}