# Fase 0 — Consolidação do Projeto Atual

> **Pré-requisito:** Toda a Fase 1 depende desta fase estar concluída.
>
> O objetivo aqui é transformar o projeto atual em uma base profissional, adicionando os padrões que todo projeto NestJS de mercado utiliza.

---

## 0.1 — Validação de DTOs com `class-validator`

### Por que isso é importante?

Atualmente o projeto aceita qualquer dado enviado pelo cliente sem validar. Em produção, isso causa bugs silenciosos e pode ser uma falha de segurança. O `class-validator` permite declarar as regras diretamente na classe do DTO usando decorators.

### Instalação

```bash
npm install class-validator class-transformer
```

### O que fazer

**1. Ativar o `ValidationPipe` global no `main.ts`:**

```typescript
// src/main.ts
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos não declarados no DTO
      forbidNonWhitelisted: true, // lança erro se campos extras forem enviados
      transform: true, // converte tipos automaticamente (ex: string -> number)
    }),
  );

  await app.listen(3000);
}
```

**2. Criar `src/users/dto/create-user.dto.ts`:**

```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  primeiroNome: string;

  @IsString()
  @IsNotEmpty()
  sobrenome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  senha: string;
}
```

**3. Usar o DTO no controller:**

```typescript
// src/users/users.controller.ts
import { CreateUserDto } from './dto/create-user.dto';

@Post()
create(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}
```

### Conceito ensinado

- Decorators de validação (`@IsString`, `@IsEmail`, `@MinLength`, etc.)
- `whitelist: true` — princípio do "least privilege" para dados de entrada
- `transform: true` — NestJS converte o JSON bruto em instâncias tipadas

---

## 0.2 — Filtro Global de Exceções

### Por que isso é importante?

Sem um filtro global, erros inesperados expõem stack traces ao cliente ou retornam respostas inconsistentes. O padrão de mercado é ter um formato de resposta de erro **único e previsível** para toda a API.

### O que fazer

**1. Criar `src/common/filters/http-exception.filter.ts`:**

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erro interno do servidor';

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: message,
    });
  }
}
```

**2. Registrar globalmente no `main.ts`:**

```typescript
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

app.useGlobalFilters(new HttpExceptionFilter());
```

### Formato de resposta de erro padronizado

Todas as respostas de erro da API terão este formato:

```json
{
  "statusCode": 400,
  "timestamp": "2026-05-29T12:00:00.000Z",
  "path": "/users",
  "error": {
    "message": ["email must be an email"],
    "error": "Bad Request",
    "statusCode": 400
  }
}
```

### Conceito ensinado

- Interface `ExceptionFilter` do NestJS
- Diferença entre `HttpException` e erros genéricos
- Padrão de resposta de erro consistente (importante para o frontend consumir)

---

## 0.3 — Documentação com Swagger

### Por que isso é importante?

O Swagger gera automaticamente uma UI interativa que documenta todos os endpoints da API. É o padrão absoluto de mercado para APIs REST — qualquer dev que receber seu projeto consegue testá-lo sem ler o código.

### Instalação

```bash
npm install @nestjs/swagger swagger-ui-express
```

### O que fazer

**1. Configurar o Swagger no `main.ts`:**

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ... pipes e filtros já configurados

  const config = new DocumentBuilder()
    .setTitle('Delivery API')
    .setDescription('API do sistema de delivery')
    .setVersion('1.0')
    .addBearerAuth() // adiciona o campo de token JWT na UI
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
```

**2. Adicionar decorators nos DTOs:**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'João' })
  @IsString()
  primeiroNome: string;

  @ApiProperty({ example: 'Silva' })
  @IsString()
  sobrenome: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  senha: string;
}
```

**3. Adicionar decorators nos controllers:**

```typescript
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Usuários')
@Controller('users')
export class UsersController {
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

**4. Acessar a documentação:**

Acesse `http://localhost:3000/api/docs` no browser.

### Conceito ensinado

- OpenAPI/Swagger como padrão de documentação
- `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`
- Como o Swagger reflete automaticamente os DTOs com `@ApiProperty`

---

## 0.4 — CRUD Completo de Usuários

### O que fazer

**1. Criar `src/users/dto/update-user.dto.ts`:**

```typescript
import { PartialType } from '@nestjs/swagger'; // ou '@nestjs/mapped-types'
import { CreateUserDto } from './create-user.dto';

// PartialType torna todos os campos do CreateUserDto opcionais
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

> `PartialType` é um utilitário do NestJS que cria um novo DTO onde todos os campos são opcionais. Evita duplicação de código.

**2. Adicionar `update` e `remove` no `users.service.ts`:**

```typescript
async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
  const user = await User.findByPk(id);
  if (!user) throw new NotFoundException('Usuário não encontrado');

  if (updateUserDto.senha) {
    updateUserDto.senha = await bcrypt.hash(updateUserDto.senha, 10);
  }

  await user.update(updateUserDto);
  return user;
}

async remove(id: number): Promise<void> {
  const user = await User.findByPk(id);
  if (!user) throw new NotFoundException('Usuário não encontrado');

  await user.destroy(); // soft delete se o model tiver o campo deletedAt
}
```

**3. Adicionar as rotas no `users.controller.ts`:**

```typescript
@Patch(':id')
update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
  return this.usersService.update(+id, updateUserDto);
}

@Delete(':id')
remove(@Param('id') id: string) {
  return this.usersService.remove(+id);
}
```

### Conceito ensinado

- `PartialType` e reutilização de DTOs
- `@Param()` para capturar parâmetros de rota
- `NotFoundException` — usar as exceções corretas do NestJS
- Conversão de tipo `+id` (string → number)

---

## 0.5 — Roles e Autorização (RBAC)

### Por que isso é importante?

Atualmente qualquer usuário autenticado acessa qualquer rota protegida. Em sistemas reais, diferentes tipos de usuário têm permissões diferentes. RBAC (Role-Based Access Control) é o padrão mais usado no mercado.

### O que fazer

**1. Atualizar o enum em `src/users/userType.ts`:**

```typescript
export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  RESTAURANT = 'restaurant',
  DELIVERY = 'delivery',
}
```

**2. Adicionar o campo `role` no `user.model.ts`:**

```typescript
import { UserRole } from '../users/userType';

@Column({
  type: DataType.ENUM(...Object.values(UserRole)),
  defaultValue: UserRole.CUSTOMER,
})
role: UserRole;
```

**3. Criar o decorator `@Roles()` em `src/auth/roles.decorator.ts`:**

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/userType';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

**4. Criar o `RolesGuard` em `src/auth/roles.guard.ts`:**

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../users/userType';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true; // sem @Roles() = qualquer autenticado pode acessar

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user?.role === role);
  }
}
```

**5. Usar o guard e o decorator nas rotas:**

```typescript
// Rota acessível apenas por admins
@Roles(UserRole.ADMIN)
@UseGuards(AuthGuard, RolesGuard)
@Delete(':id')
remove(@Param('id') id: string) {
  return this.usersService.remove(+id);
}
```

> **Atenção:** O `AuthGuard` sempre deve vir **antes** do `RolesGuard`, pois o roles guard depende do `user` já estar no `request` (colocado pelo auth guard).

### Conceito ensinado

- `SetMetadata` e leitura de metadados com `Reflector`
- Composição de guards (`AuthGuard` + `RolesGuard`)
- Enum de roles e como tipá-los
- Princípio de menor privilégio (least privilege)

---

## ✅ Checklist da Fase 0

- [ ] `class-validator` instalado e `ValidationPipe` global ativo
- [ ] DTO `CreateUserDto` com validações
- [ ] DTO `UpdateUserDto` usando `PartialType`
- [ ] `HttpExceptionFilter` criado e registrado globalmente
- [ ] Swagger configurado e acessível em `/api/docs`
- [ ] Endpoints PATCH e DELETE de usuário implementados
- [ ] Enum `UserRole` com os 4 papéis
- [ ] Decorator `@Roles()` criado
- [ ] `RolesGuard` criado e aplicado

---

## ➡️ Próximo passo

Com a base consolidada, avance para a [Fase 1 — Delivery MVP](./fase-1-delivery-mvp.md).
