import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Order } from '../models/order.model';
import { OrderItem } from '../models/order-item.model';
import { Product } from '../models/product.model';
import { OrderStatus } from './order-status.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { UserRole } from '../users/userType';
import { PaginationDto } from '../common/dto/pagination.dto';
import { TrackingGateway } from '../gateways/tracking.gateway';

// Define quais transições de status são permitidas e por qual role
const STATUS_TRANSITIONS: Record<
  OrderStatus,
  { next: OrderStatus; allowedRole: UserRole }[]
> = {
  [OrderStatus.PENDING]: [
    { next: OrderStatus.ACCEPTED, allowedRole: UserRole.RESTAURANT },
    { next: OrderStatus.REJECTED, allowedRole: UserRole.RESTAURANT },
    { next: OrderStatus.CANCELLED, allowedRole: UserRole.CUSTOMER },
  ],
  [OrderStatus.ACCEPTED]: [
    { next: OrderStatus.PREPARING, allowedRole: UserRole.RESTAURANT },
    { next: OrderStatus.CANCELLED, allowedRole: UserRole.RESTAURANT },
  ],
  [OrderStatus.PREPARING]: [
    { next: OrderStatus.OUT_FOR_DELIVERY, allowedRole: UserRole.DELIVERY },
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    { next: OrderStatus.DELIVERED, allowedRole: UserRole.DELIVERY },
  ],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order) private orderModel: typeof Order,
    @InjectModel(OrderItem) private orderItemModel: typeof OrderItem,
    @InjectModel(Product) private productModel: typeof Product,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    customerId: number,
  ): Promise<Order> {
    let total = 0;
    const itemsToCreate = [];

    for (const item of createOrderDto.items) {
      const product = await this.productModel.findByPk(item.productId);
      if (!product || !product.disponivel) {
        throw new BadRequestException(
          `Produto ${item.productId} não está disponível`,
        );
      }

      const precoUnitario = Number(product.preco);
      total += precoUnitario * item.quantidade;
      itemsToCreate.push({
        productId: item.productId,
        quantidade: item.quantidade,
        precoUnitario,
      });
    }

    const order = await this.orderModel.create({
      customerId,
      restaurantId: createOrderDto.restaurantId,
      enderecoEntrega: createOrderDto.enderecoEntrega,
      observacao: createOrderDto.observacao,
      total,
      status: OrderStatus.PENDING,
    });

    for (const item of itemsToCreate) {
      await this.orderItemModel.create({ ...item, orderId: order.id });
    }

    return this.findOne(order.id);
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderModel.findByPk(id, {
      include: ['items', 'customer', 'restaurant'],
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }

  async updateStatus(
    orderId: number,
    newStatus: OrderStatus,
    userId: number,
    userRole: UserRole,
  ): Promise<Order> {
    const order = await this.findOne(orderId);

    const allowedTransitions = STATUS_TRANSITIONS[order.status];
    const transition = allowedTransitions.find((t) => t.next === newStatus);

    if (!transition) {
      throw new BadRequestException(
        `Não é possível mudar status de "${order.status}" para "${newStatus}"`,
      );
    }

    if (transition.allowedRole !== userRole && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        `Apenas "${transition.allowedRole}" pode fazer esta transição`,
      );
    }

    await order.update({ status: newStatus });
    this.trackingGateway.notifyOrderStatusChange(orderId, newStatus);
    return order;
  }

  async findAll(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const { count, rows } = await this.orderModel.findAndCountAll({
      limit,
      offset,
      include: ['customer', 'restaurant'],
      order: [['createdAt', 'DESC']],
    });

    return {
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  // cancelar pedido (apenas cliente pode cancelar se estiver PENDING ou ACCEPTED)
  async cancelOrder(orderId: number, userId: number): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.customerId !== userId) {
      throw new ForbiddenException('Você só pode cancelar seus próprios pedidos');
    }
    
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        'Só é possível cancelar pedidos que estão PENDING ou ACCEPTED',
      );
    }

    await order.update({ status: OrderStatus.CANCELLED });
    this.trackingGateway.notifyOrderStatusChange(orderId, OrderStatus.CANCELLED);
    return order;
  }

  // encontrar pedidos por restaurante com filtro (padrão listado é todos)
  async findByRestaurant(
    restaurantId: number,
    status?: OrderStatus,
    pagination?: PaginationDto,
  ) {
    const { page = 1, limit = 10 } = pagination || {};
    const offset = (page - 1) * limit;

    const where: any = { restaurantId };
    if (status) where.status = status;

    const { count, rows } = await this.orderModel.findAndCountAll({
      where,
      limit,
      offset,
      include: ['customer', 'items'],
      order: [['createdAt', 'DESC']],
    });

    return {
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  // encontrar pedidos por cliente com filtro (padrão listado é todos)
  async findByCustomer(
    customerId: number,
    pagination: PaginationDto,
    status?: OrderStatus,
  ) {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const where: any = { customerId };
    if (status) where.status = status;

    const { count, rows } = await this.orderModel.findAndCountAll({
      where,
      limit,
      offset,
      include: ['restaurant', 'items'],
      order: [['createdAt', 'DESC']],
    });

    return {
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }
}
