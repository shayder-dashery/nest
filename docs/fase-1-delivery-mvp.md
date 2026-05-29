# Fase 1 — Delivery MVP

> **Pré-requisito:** [Fase 0](./fase-0-consolidacao.md) concluída.
>
> Nesta fase construímos o núcleo funcional do sistema: restaurantes, cardápio, pedidos e o fluxo completo de um delivery.

---

## Visão Geral do Fluxo

```
[Cliente] → cria pedido
              ↓
[Restaurante] → aceita ou recusa
              ↓ (se aceito)
[Restaurante] → marca como "em preparo"
              ↓
[Entregador]  → coleta o pedido → "saiu para entrega"
              ↓
[Entregador]  → confirma entrega → "entregue"
```

---

## 1.1 — Model `Restaurant`

### Relacionamentos desta entidade

```
User (role=RESTAURANT) ──1───N── Restaurant
Restaurant             ──1───N── Product
Restaurant             ──1───N── Order
```

### O que fazer

**1. Criar `src/models/restaurant.model.ts`:**

```typescript
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
```

**2. Registrar no `AppModule` (array `models` do SequelizeModule):**

```typescript
// src/app.module.ts
models: [User, Restaurant, Product, Order, OrderItem],
```

### Conceito ensinado

- `@ForeignKey` e `@BelongsTo` — relacionamento N:1 (muitos restaurantes para um usuário)
- `@HasMany` — relacionamento 1:N (um restaurante tem muitos produtos)
- `timestamps: true` — Sequelize adiciona `createdAt` e `updatedAt` automaticamente

---

## 1.2 — Module `Restaurants` (CRUD completo)

### Estrutura de arquivos

```
src/restaurants/
├── dto/
│   ├── create-restaurant.dto.ts
│   └── update-restaurant.dto.ts
├── restaurants.controller.ts
├── restaurants.module.ts
└── restaurants.service.ts
```

### O que fazer

**1. Criar `src/restaurants/dto/create-restaurant.dto.ts`:**

```typescript
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
```

**2. Criar `src/restaurants/restaurants.service.ts`:**

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Restaurant } from '../models/restaurant.model';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant)
    private restaurantModel: typeof Restaurant,
  ) {}

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantModel.findAll({ where: { ativo: true } });
  }

  async findOne(id: number): Promise<Restaurant> {
    const restaurant = await this.restaurantModel.findByPk(id);
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado');
    return restaurant;
  }

  async create(
    createDto: CreateRestaurantDto,
    userId: number,
  ): Promise<Restaurant> {
    return this.restaurantModel.create({ ...createDto, userId });
  }

  async update(
    id: number,
    updateDto: UpdateRestaurantDto,
    userId: number,
  ): Promise<Restaurant> {
    const restaurant = await this.findOne(id);

    // Garante que apenas o dono do restaurante pode editar
    if (restaurant.userId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este restaurante',
      );
    }

    await restaurant.update(updateDto);
    return restaurant;
  }

  async remove(id: number, userId: number): Promise<void> {
    const restaurant = await this.findOne(id);
    if (restaurant.userId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir este restaurante',
      );
    }
    await restaurant.destroy();
  }
}
```

**3. Criar `src/restaurants/restaurants.controller.ts`:**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/userType';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@ApiTags('Restaurantes')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  findAll() {
    return this.restaurantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(+id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  create(@Body() createDto: CreateRestaurantDto, @Request() req) {
    return this.restaurantsService.create(createDto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRestaurantDto,
    @Request() req,
  ) {
    return this.restaurantsService.update(+id, updateDto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.restaurantsService.remove(+id, req.user.sub);
  }
}
```

### Conceito ensinado

- `@Request() req` para acessar o usuário logado dentro do controller
- `ForbiddenException` vs `UnauthorizedException` (403 vs 401)
- Injeção de model via `@InjectModel()`

---

## 1.3 — Model `Product`

### O que fazer

**1. Criar `src/models/product.model.ts`:**

```typescript
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
```

**2. Criar o módulo `Products` seguindo a mesma estrutura do `Restaurants`.**

> Desafio para os alunos: implementar o CRUD de `Product` com base no que foi feito para `Restaurant`.

### Conceito ensinado

- `DECIMAL(10, 2)` para valores monetários — nunca usar `FLOAT` para dinheiro
- Reutilização do padrão aprendido no módulo anterior

---

## 1.4 — Models `Order` e `OrderItem` com State Machine

### O relacionamento N:M via tabela pivot

```
Order ──1───N── OrderItem ──N───1── Product
```

O `OrderItem` é a tabela pivot que representa "qual produto e em qual quantidade está no pedido".

### O que fazer

**1. Criar `src/orders/order-status.enum.ts`:**

```typescript
export enum OrderStatus {
  PENDING = 'pending', // aguardando confirmação do restaurante
  ACCEPTED = 'accepted', // aceito pelo restaurante
  REJECTED = 'rejected', // recusado pelo restaurante
  PREPARING = 'preparing', // em preparo
  OUT_FOR_DELIVERY = 'out_for_delivery', // saiu para entrega
  DELIVERED = 'delivered', // entregue
  CANCELLED = 'cancelled', // cancelado pelo cliente
}
```

**2. Criar `src/models/order.model.ts`:**

```typescript
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
```

**3. Criar `src/models/order-item.model.ts`:**

```typescript
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
```

> **Por que salvar `precoUnitario`?** Se o restaurante alterar o preço do produto depois, o pedido já feito deve manter o preço original. Isso é um requisito de negócio clássico.

### Conceito ensinado

- Tabela pivot (`OrderItem`) para representar N:M com dados extras
- Enum de status como State Machine
- Snapshot de preço (imutabilidade de dados históricos)

---

## 1.5 — Service de Orders com State Machine

### O que fazer

**Criar `src/orders/orders.service.ts`:**

```typescript
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
    return order;
  }
}
```

### Conceito ensinado

- **State Machine** — padrão fundamental para fluxos de negócio
- Validação de transições em tempo de execução
- Separação de lógica de negócio no Service (não no Controller)
- `include` no Sequelize para carregar relacionamentos (eager loading)

---

## 1.6 — DTOs de Criação de Pedido

### O que fazer

**Criar `src/orders/dto/create-order.dto.ts`:**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

class OrderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  productId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  quantidade: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  restaurantId: number;

  @ApiProperty({ example: 'Rua das Flores, 123' })
  @IsString()
  @IsNotEmpty()
  enderecoEntrega: string;

  @ApiProperty({ example: 'Sem cebola', required: false })
  @IsString()
  @IsOptional()
  observacao?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

### Conceito ensinado

- `@ValidateNested` + `@Type()` — validação de arrays de objetos aninhados
- `class-transformer` trabalhando junto com `class-validator`

---

## 1.7 — Paginação e Filtros

### Por que isso é importante?

Em produção, retornar 10.000 registros em uma só requisição derruba qualquer servidor. Paginação é um requisito básico de qualquer API real.

### O que fazer

**1. Criar `src/common/dto/pagination.dto.ts`:**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
```

**2. Usar paginação no service:**

```typescript
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
```

**3. Usar no controller com `@Query()`:**

```typescript
@Get()
findAll(@Query() pagination: PaginationDto) {
  return this.ordersService.findAll(pagination);
}
```

### Formato de resposta paginada

```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

### Conceito ensinado

- `@Query()` para capturar query params (`?page=1&limit=10`)
- `findAndCountAll` do Sequelize
- Padrão de resposta com `data` e `meta`
- Reutilização de `PaginationDto` em todos os módulos

---

## ✅ Checklist da Fase 1

- [ ] Model `Restaurant` criado com relacionamentos
- [ ] CRUD completo de `Restaurant` (com proteção por role)
- [ ] Model `Product` criado
- [ ] CRUD completo de `Product`
- [ ] Enum `OrderStatus` com todos os estados
- [ ] Models `Order` e `OrderItem` criados
- [ ] Service de `Orders` com State Machine implementada
- [ ] DTO `CreateOrderDto` com validação aninhada
- [ ] Paginação implementada em pelo menos um endpoint
- [ ] Todos os modelos registrados no `AppModule`

---

## ➡️ Próximo passo

Com o MVP funcionando, avance para a [Fase 2 — Conceitos Avançados](./fase-2-avancado.md).
