import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Product } from './product.model';
import { Order } from './order.model';

@Table({ tableName: 'restaurants', timestamps: true })
export class Restaurant extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  nome: string;

  @Column({ type: DataType.STRING, allowNull: false })
  endereco: string;

  @Column({ type: DataType.STRING, allowNull: false })
  telefone: string;

  @Column({ type: DataType.STRING, allowNull: true })
  descricao: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  ativo: boolean;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  owner: User;

  @HasMany(() => Product)
  products: Product[];

  @HasMany(() => Order)
  orders: Order[];
}