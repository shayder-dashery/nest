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
import { Restaurant } from './restaurant.model';
import { OrderItem } from './order-item.model';
import { OrderStatus } from '../orders/order-status.enum';

@Table({ tableName: 'orders', timestamps: true })
export class Order extends Model {
  @Column({
    type: DataType.ENUM(...Object.values(OrderStatus)),
    defaultValue: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  total: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  observacao: string;

  @Column({ type: DataType.STRING, allowNull: false })
  enderecoEntrega: string;

  @ForeignKey(() => User)
  @Column
  customerId: number;

  @BelongsTo(() => User)
  customer: User;

  @ForeignKey(() => Restaurant)
  @Column
  restaurantId: number;

  @BelongsTo(() => Restaurant)
  restaurant: Restaurant;

  @HasMany(() => OrderItem)
  items: OrderItem[];
}