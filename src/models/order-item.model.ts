import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Order } from './order.model';
import { Product } from './product.model';

@Table({ tableName: 'order_items', timestamps: false })
export class OrderItem extends Model {
  @Column({ type: DataType.INTEGER, allowNull: false })
  quantidade: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  precoUnitario: number; // preço no momento do pedido (importante!)

  @ForeignKey(() => Order)
  @Column
  orderId: number;

  @BelongsTo(() => Order)
  order: Order;

  @ForeignKey(() => Product)
  @Column
  productId: number;

  @BelongsTo(() => Product)
  product: Product;
}