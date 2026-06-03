import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Pizza Margherita' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'Tomate, mussarela e manjericão', required: false })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  preco: number;

  @ApiProperty({ example: 'http://example.com/pizza.jpg', required: false })
  @IsString()
  @IsOptional()
  imagemUrl?: string;

  disponivel?: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId: number;
}