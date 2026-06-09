# Fase 2 — Conceitos Avançados

> **Pré-requisito:** [Fase 1](./fase-1-delivery-mvp.md) concluída.
>
> Nesta fase adicionamos as funcionalidades que **separam um projeto de portfólio de um projeto de produção**: comunicação em tempo real, processamento assíncrono, testes automatizados e gestão de arquivos.

---

## 2.1 — WebSockets: Rastreamento em Tempo Real

### Por que isso é importante?

REST é baseado em requisição-resposta: o cliente pergunta, o servidor responde. WebSockets permitem **comunicação bidirecional contínua** — o servidor pode avisar o cliente quando algo muda, sem o cliente precisar perguntar. É o que permite o mapa de rastreamento do iFood/Uber Eats atualizar em tempo real.

### Instalação

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### O que fazer

**1. Criar `src/gateways/tracking.gateway.ts`:**

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' }, // em produção, restringir origem
  namespace: '/tracking',
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  // Cliente entra na "sala" do pedido para receber atualizações
  @SubscribeMessage('joinOrder')
  handleJoinOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`order:${orderId}`);
    client.emit('joined', {
      orderId,
      message: 'Você está rastreando este pedido',
    });
  }

  // Chamado pelo OrdersService quando o status muda
  notifyOrderStatusChange(orderId: number, status: string) {
    this.server.to(`order:${orderId}`).emit('statusUpdate', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**2. Injetar o Gateway no `OrdersService`:**

```typescript
// src/orders/orders.service.ts
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
import { TrackingGateway } from 'src/gateways/tracking.gateway';

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

```

**3. Criar `src/gateways/gateways.module.ts`:**

```typescript
import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';

@Module({
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class GatewaysModule {}
```

**4. Importar o `GatewaysModule` no `OrdersModule`.**

```typescript
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Order } from '../models/order.model';
import { OrderItem } from '../models/order-item.model';
import { Product } from '../models/product.model';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [SequelizeModule.forFeature([Order, OrderItem, Product]), GatewaysModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

```

### Como testar no frontend (JavaScript simples)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/tracking');

// Entrar na sala de um pedido específico
socket.emit('joinOrder', '42');

// Escutar atualizações de status
socket.on('statusUpdate', (data) => {
  console.log('Status atualizado:', data);
  // { orderId: 42, status: 'out_for_delivery', timestamp: '...' }
});
```

### Conceito ensinado

- WebSocket vs HTTP — quando usar cada um
- Salas (rooms) do Socket.io para comunicação direcionada
- `@WebSocketGateway`, `@WebSocketServer`, `@SubscribeMessage`
- Como injetar um Gateway em um Service (NestJS DI)

---

## 2.2 — Filas com Bull: Notificações Assíncronas

### Por que isso é importante?

Imagine que ao aceitar um pedido, o sistema precisa:

1. Enviar um email ao cliente
2. Enviar um SMS
3. Notificar o entregador mais próximo
4. Atualizar analytics

Se tudo isso for feito de forma síncrona, o endpoint de "aceitar pedido" vai demorar vários segundos. **Filas** permitem que o endpoint responda imediatamente e essas tarefas sejam executadas em segundo plano.

### Instalação

```bash
npm install @nestjs/bull bull
npm install @types/bull --save-dev
```

> **Nota:** O Bull requer Redis. Para desenvolvimento, use Docker:
>
> ```bash
> docker run -d -p 6379:6379 redis:alpine
> ```

### O que fazer

**1. Configurar o Bull no `AppModule`:**

```typescript
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    BullModule.registerQueue({ name: 'notifications' }),
    // ...outros imports
  ],
})
export class AppModule {}
```

**2. Criar `src/notifications/notifications.processor.ts`:**

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

export interface OrderStatusNotification {
  orderId: number;
  customerId: number;
  customerEmail: string;
  oldStatus: string;
  newStatus: string;
}

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  @Process('order-status-changed')
  async handleOrderStatusChanged(job: Job<OrderStatusNotification>) {
    const { orderId, customerEmail, newStatus } = job.data;

    this.logger.log(
      `Enviando notificação para ${customerEmail}: pedido #${orderId} agora está "${newStatus}"`,
    );

    // Aqui você integraria com um serviço de email (Nodemailer, SendGrid, etc.)
    // await this.emailService.send({ to: customerEmail, ... });

    // Simula o envio
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.logger.log(`Notificação enviada para pedido #${orderId}`);
  }
}
```

**3. Adicionar a fila ao `OrdersService`:**

```typescript
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class OrdersService {
  constructor(
    // ...outros injects
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async updateStatus(orderId: number, newStatus: OrderStatus, ...) {
    const oldStatus = order.status;
    await order.update({ status: newStatus });

    // Adiciona o job na fila — resposta imediata para o cliente
    await this.notificationsQueue.add('order-status-changed', {
      orderId,
      customerId: order.customerId,
      customerEmail: order.customer.email,
      oldStatus,
      newStatus,
    });

    this.trackingGateway.notifyOrderStatusChange(orderId, newStatus);
    return order;
  }
}
```

### Fluxo visual

```
[POST /orders/:id/status]
        │
        ▼
  [OrdersService]
   ├── atualiza banco      ← síncrono (rápido)
   ├── notifica WebSocket  ← síncrono (rápido)
   └── adiciona na fila    ← síncrono (rápido)
        │
        └──► [Redis Queue]
                │
                ▼ (em background)
        [NotificationsProcessor]
         └── envia email    ← assíncrono (pode ser lento)
```

### Conceito ensinado

- Processamento assíncrono com filas
- Separação de responsabilidades (o endpoint não precisa saber como a notificação é enviada)
- `@Processor`, `@Process`, `@InjectQueue`
- Por que usar Redis como broker de filas

---

## 2.3 — Testes Unitários com Jest

### Por que isso é importante?

Testes garantem que o código funciona corretamente e que novas funcionalidades não quebram o que já existe. É um requisito em praticamente todas as vagas de dev pleno/sênior.

### O que testar primeiro

Comece pelos Services, pois eles contêm a lógica de negócio. Controllers são mais simples e geralmente testados via E2E.

### O que fazer

**1. Criar `src/orders/orders.service.spec.ts`:**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getModelToken } from '@nestjs/sequelize';
import { Order } from '../models/order.model';
import { OrderItem } from '../models/order-item.model';
import { Product } from '../models/product.model';
import { TrackingGateway } from '../gateways/tracking.gateway';
import { getQueueToken } from '@nestjs/bull';
import { OrderStatus } from './order-status.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock do model Order
const mockOrder = {
  id: 1,
  status: OrderStatus.PENDING,
  customerId: 1,
  restaurantId: 1,
  total: 50.0,
  update: jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    return this;
  }),
  customer: { email: 'cliente@email.com' },
};

const mockOrderModel = {
  findByPk: jest.fn(),
  create: jest.fn(),
  findAndCountAll: jest.fn(),
};

const mockTrackingGateway = {
  notifyOrderStatusChange: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order), useValue: mockOrderModel },
        { provide: getModelToken(OrderItem), useValue: {} },
        { provide: getModelToken(Product), useValue: {} },
        { provide: TrackingGateway, useValue: mockTrackingGateway },
        { provide: getQueueToken('notifications'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // limpa os mocks entre cada teste
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException se o pedido não existir', async () => {
      mockOrderModel.findByPk.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('deve retornar o pedido quando ele existir', async () => {
      mockOrderModel.findByPk.mockResolvedValue(mockOrder);

      const result = await service.findOne(1);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('updateStatus (State Machine)', () => {
    it('deve lançar BadRequestException para transição inválida', async () => {
      const orderDelivered = { ...mockOrder, status: OrderStatus.DELIVERED };
      mockOrderModel.findByPk.mockResolvedValue(orderDelivered);

      await expect(
        service.updateStatus(1, OrderStatus.PENDING, 1, 'customer' as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve atualizar status quando a transição é válida', async () => {
      mockOrderModel.findByPk.mockResolvedValue({ ...mockOrder });

      // Cliente pode cancelar um pedido PENDING
      const result = await service.updateStatus(
        1,
        OrderStatus.CANCELLED,
        1,
        'customer' as any,
      );

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockTrackingGateway.notifyOrderStatusChange).toHaveBeenCalledWith(
        1,
        OrderStatus.CANCELLED,
      );
    });
  });
});
```

**2. Rodar os testes:**

```bash
npm test                    # roda todos os testes
npm test -- --watch         # modo watch (re-roda ao salvar)
npm test -- --coverage      # relatório de cobertura
```

### Conceito ensinado

- Estrutura `describe` / `it` / `expect`
- `jest.fn()` e `mockResolvedValue` — como mockar dependências
- `beforeEach` e `afterEach`
- `TestingModule` do NestJS para criar ambiente de teste isolado
- Por que testar o Service e não o banco direto

---

## 2.4 — Testes E2E (End-to-End)

### Por que isso é importante?

Testes unitários testam peças isoladas. Testes E2E simulam uma **requisição HTTP real** de ponta a ponta, passando por controller → service → banco de dados.

### O que fazer

**1. Editar `test/app.e2e-spec.ts`:**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users (criar usuário)', () => {
    it('deve criar um usuário e retornar 201', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          primeiroNome: 'João',
          sobrenome: 'Silva',
          email: 'joao@teste.com',
          senha: 'senha123',
        })
        .expect(201);
    });

    it('deve retornar 400 com email inválido', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          primeiroNome: 'João',
          sobrenome: 'Silva',
          email: 'email-invalido',
          senha: 'senha123',
        })
        .expect(400);
    });
  });

  describe('POST /login', () => {
    it('deve retornar um token JWT ao fazer login', async () => {
      // Primeiro cria o usuário
      await request(app.getHttpServer()).post('/users').send({
        primeiroNome: 'Maria',
        sobrenome: 'Souza',
        email: 'maria@teste.com',
        senha: 'senha123',
      });

      // Depois faz login
      const response = await request(app.getHttpServer())
        .post('/login')
        .send({ email: 'maria@teste.com', senha: 'senha123' })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      accessToken = response.body.access_token;
    });
  });

  describe('GET /users (rota protegida)', () => {
    it('deve retornar 401 sem token', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('deve retornar 200 com token válido', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
```

**2. Rodar os testes E2E:**

```bash
npm run test:e2e
```

### Conceito ensinado

- `supertest` para simular requisições HTTP
- `beforeAll` / `afterAll` para setup e teardown do servidor de testes
- Testes encadeados (criar usuário → fazer login → usar token)
- Diferença entre testes unitários e E2E

---

## 2.5 — Upload de Imagens com Multer

### Por que isso é importante?

Produtos de um restaurante precisam de fotos. Upload de arquivos é uma funcionalidade presente em praticamente todo sistema web. O NestJS tem integração nativa com o Multer.

### Instalação

```bash
npm install @types/multer --save-dev
```

### O que fazer

**1. Criar `src/common/config/multer.config.ts`:**

```typescript
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname);
      callback(null, `${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req, file, callback) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Apenas imagens JPEG, PNG e WebP são permitidas',
        ),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};
```

**2. Adicionar upload de imagem ao `ProductsController`:**

```typescript
import { UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { multerConfig } from '../common/config/multer.config';

@ApiBearerAuth()
@Roles(UserRole.RESTAURANT, UserRole.ADMIN)
@UseGuards(AuthGuard, RolesGuard)
@Post(':id/image')
@ApiConsumes('multipart/form-data') // informa ao Swagger que aceita form-data
@UseInterceptors(FileInterceptor('image', multerConfig))
async uploadProductImage(
  @Param('id') id: string,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  const imagemUrl = `/uploads/${file.filename}`;
  return this.productsService.updateImage(+id, imagemUrl);
}
```

**3. Servir os arquivos estáticos no `main.ts`:**

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });
```

### Conceito ensinado

- `FileInterceptor` e `@UploadedFile()`
- `ParseFilePipe` com validators encadeados (`MaxFileSizeValidator`, `FileTypeValidator`)
- Servir arquivos estáticos com NestJS
- Segurança: validar tipo MIME (não confiar na extensão do arquivo)

---

## 2.6 — Logger e Interceptor de Resposta (Bônus)

### Por que isso é importante?

Em produção, você precisa saber o que aconteceu quando um erro ocorre. Um logger centralizado e um interceptor de resposta padronizado são práticas de observabilidade básica.

### O que fazer

**1. Criar `src/common/interceptors/response.interceptor.ts`:**

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

**2. Registrar globalmente no `main.ts`:**

```typescript
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

app.useGlobalInterceptors(new ResponseInterceptor());
```

**3. Agora todas as respostas de sucesso terão o formato:**

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-05-29T12:00:00.000Z"
}
```

### Conceito ensinado

- `NestInterceptor` e o padrão de interceptação
- Operador `map` do RxJS para transformar respostas
- Padronização de respostas (frontend agora sempre sabe a estrutura)

---

## ✅ Checklist da Fase 2

- [ ] WebSocket Gateway criado para rastreamento
- [ ] `joinOrder` e `statusUpdate` funcionando
- [ ] Gateway notificando ao mudar status do pedido
- [ ] Bull configurado com fila `notifications`
- [ ] Processor criado para processar notificações
- [ ] Testes unitários do `OrdersService` (mínimo 3 testes)
- [ ] Testes E2E de autenticação e pedidos funcionando
- [ ] Upload de imagem de produto funcionando
- [ ] `ResponseInterceptor` padronizando respostas de sucesso

---

## 🎓 Parabéns! Ao concluir as 3 fases, você domina:

| Conceito                         | Onde foi aplicado                     |
| -------------------------------- | ------------------------------------- |
| Módulos e injeção de dependência | Todo o projeto                        |
| JWT + Guards                     | Auth, Roles                           |
| Validação de dados               | class-validator, DTOs                 |
| Relacionamentos ORM              | Restaurant, Product, Order, OrderItem |
| State Machine                    | OrderStatus transitions               |
| Comunicação em tempo real        | TrackingGateway                       |
| Filas assíncronas                | NotificationsProcessor                |
| Testes unitários e E2E           | OrdersService, app.e2e-spec           |
| Upload de arquivos               | ProductsController                    |
| Documentação automática          | Swagger em todos os módulos           |
| Tratamento centralizado de erros | HttpExceptionFilter                   |
| Padronização de respostas        | ResponseInterceptor                   |
