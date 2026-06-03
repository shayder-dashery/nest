import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Restaurant } from './restaurant.model';

@Table({ tableName: 'products', timestamps: true })
export class Product extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  nome: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  descricao: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  preco: number;

  @Column({ type: DataType.STRING, allowNull: true })
  imagemUrl: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  disponivel: boolean;

  @ForeignKey(() => Restaurant)
  @Column
  restaurantId: number;

  @BelongsTo(() => Restaurant)
  restaurant: Restaurant;
}