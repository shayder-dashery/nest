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
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { UsersModule } from './users/users.module';
import { LoginModule } from './login/login.module';
import { Restaurant } from './models/restaurant.model';
import { Product } from './models/product.model';
import { Order } from './models/order.model';
import { OrderItem } from './models/order-item.model';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'sqlite',
      storage: './database.sqlite',
      autoLoadModels: true,
      synchronize: true,
      models: [User, Restaurant, Product, Order, OrderItem],
    }),
    UsersModule,
    LoginModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

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

**1.2. Criar `src/restaurants/dto/update-restaurant.dto.ts`:**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateRestaurantDto } from './create-restaurant.dto';

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {}
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

**4. Criar `src/restaurants/restaurants.module.ts`:**

```typescript
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Restaurant } from '../models/restaurant.model';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [SequelizeModule.forFeature([Restaurant])],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
})
export class RestaurantsModule {}
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

**2. Criar /src/products/dto/create-product.dto.ts:**

```typescript
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
```

**3. Criar `src/products/dto/update-product.dto.ts`:**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

**4 Criar `src/products/products.service.ts`**

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Product } from '../models/product.model';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Restaurant } from '../models/restaurant.model';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product)
    private productModel: typeof Product,
    @InjectModel(Restaurant)
    private restaurantModel: typeof Restaurant,
  ) {}

  async findAllByRestaurant(restaurantId: number): Promise<Product[]> {
    return this.productModel.findAll({
      where: { restaurantId, disponivel: true },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productModel.findByPk(id);
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async create(createDto: CreateProductDto, userId: number): Promise<Product> {
    const restaurant = await this.restaurantModel.findByPk(
      createDto.restaurantId,
    );
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado');
    if (restaurant.userId !== userId) {
      throw new ForbiddenException('Você não é o dono deste restaurante');
    }
    return this.productModel.create({ ...createDto });
  }

  async update(
    id: number,
    updateDto: UpdateProductDto,
    restaurantId: number,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (product.restaurantId !== restaurantId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este produto',
      );
    }

    await product.update(updateDto);
    return product;
  }

  async remove(id: number, restaurantId: number): Promise<void> {
    const product = await this.findOne(id);
    if (product.restaurantId !== restaurantId) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir este produto',
      );
    }
    await product.destroy();
  }
}
```

**5. Criar `src/products/products.controller.ts`**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/userType';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Produtos')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Listar produtos de um restaurante' })
  @ApiResponse({ status: 200, description: 'Lista de produtos.' })
  @Get('restaurant/:restaurantId')
  findAllByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.productsService.findAllByRestaurant(+restaurantId);
  }

  @ApiOperation({ summary: 'Obter detalhes de um produto' })
  @ApiResponse({ status: 200, description: 'Detalhes do produto.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Criar um novo produto' })
  @ApiResponse({ status: 201, description: 'Produto criado.' })
  @Post()
  create(@Body() createDto: CreateProductDto, @Request() req) {
    return this.productsService.create(createDto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Atualizar um produto existente' })
  @ApiResponse({ status: 200, description: 'Produto atualizado.' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductDto,
    @Request() req,
  ) {
    return this.productsService.update(+id, updateDto, req.user.sub);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Excluir um produto' })
  @ApiResponse({ status: 204, description: 'Produto excluído.' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.productsService.remove(+id, req.user.sub);
  }
}
```

**6. Criar `src/products/products.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Product } from '../models/product.model';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Restaurant } from '../models/restaurant.model';

@Module({
  imports: [SequelizeModule.forFeature([Product, Restaurant])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
```

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
import { PaginationDto } from '../common/dto/pagination.dto';

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
import { PaginationDto } from '../common/dto/pagination.dto.ts';

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
}

```

**3. Criar `src/orders/orders.controller.ts`:**

```typescript
import { Controller, Get, Query, Patch, Body, Param, UseGuards, Request, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderStatus } from './order-status.enum';
import { UserRole } from '../users/userType';
import { AuthGuard } from '../auth/auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Pedidos')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Listar pedidos com paginação' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos paginada.' })
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.ordersService.findAll(pagination);
  }

  @ApiOperation({ summary: 'Obter detalhes de um pedido' })
  @ApiResponse({ status: 200, description: 'Detalhes do pedido.' })
  @Get(':id')
  findOne(@Query('id') id: number) {
    return this.ordersService.findOne(id);
  }

  @ApiOperation({ summary: 'Atualizar status de um pedido' })
  @ApiResponse({ status: 200, description: 'Status do pedido atualizado.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('newStatus') newStatus: OrderStatus,
    @Request() req,
  ) {
    return this.ordersService.updateStatus(
      +id,
      newStatus,
      req.user.sub,
      req.user.role,
    );
  }

  @ApiOperation({ summary: 'Criar um novo pedido' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.ordersService.create(createOrderDto, req.user.sub);
  }

  @ApiOperation({ summary: 'Cancelar um pedido' })
  @ApiResponse({ status: 200, description: 'Pedido cancelado com sucesso.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.cancelOrder(+id, req.user.sub);
  }

  @ApiOperation({ summary: 'Listar pedidos de um restaurante' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos do restaurante.' })
  @Get('restaurant/:id')
  findByRestaurant(
    @Param('id') id: string,
    @Query('status') status?: OrderStatus,
    @Query() pagination?: PaginationDto,
  ) {
    return this.ordersService.findByRestaurant(+id, status, pagination);
  }

  @ApiOperation({ summary: 'Listar meus pedidos' })
  @ApiResponse({ status: 200, description: 'Sua lista de pedidos.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('customer')
  findByCustomer(
    @Request() req,
    @Query() pagination: PaginationDto,
    @Query('status') status?: OrderStatus) {
    return this.ordersService.findByCustomer(req.user.sub, pagination, status);
  }

  @ApiOperation({ summary: 'Listar pedidos de um cliente' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos do cliente.' })
  @Get('customer/:id')
  findByCustomerId(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: OrderStatus) {
    return this.ordersService.findByCustomer(+id, pagination, status);
    }
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

** 4 Criar `src/orders/orders.module.ts` e registrar os models necessários.**
```typescript
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Order } from '../models/order.model';
import { OrderItem } from '../models/order-item.model';
import { Product } from '../models/product.model';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [SequelizeModule.forFeature([Order, OrderItem, Product])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

**5. Registrar `OrdersModule` , `ProductsModule` e `RestaurantsModule` no `AppModule`.**

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { UsersModule } from './users/users.module';
import { LoginModule } from './login/login.module';
import { Restaurant } from './models/restaurant.model';
import { Product } from './models/product.model';
import { Order } from './models/order.model';
import { OrderItem } from './models/order-item.model';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';


@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'sqlite',
      storage: './database.sqlite',
      autoLoadModels: true,
      synchronize: true,
      models: [User, Restaurant, Product, Order, OrderItem],
    }),
    UsersModule,
    LoginModule,
    RestaurantsModule,
    ProductsModule,
    OrdersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**6. Registrar `role` do usuário no token JWT para que o serviço de Orders possa validar as transições de status. `src/login/login.service.ts`**

```typescript
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { User } from '../models/user.model';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class LoginService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<{
    message: string;
    status: string;
    access_token: string;
  }> {
    const { email, password } = loginDto;

    const findOneByEmail = async (email: string): Promise<User | null> => {
      return this.userModel.findOne({ where: { email } });
    };

    const user = await findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.senha);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      message: 'Login successful',
      status: 'success',
      access_token: await this.jwtService.signAsync(payload),
    };
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
