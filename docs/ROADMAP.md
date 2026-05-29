# 🚀 Roadmap — Sistema de Delivery com NestJS

Este documento apresenta o plano completo de evolução do projeto, partindo da base já construída (autenticação JWT + CRUD de usuários) até um sistema de delivery com rastreamento em tempo real.

---

## 📌 Visão Geral do Projeto

Vamos construir uma API para um sistema de **delivery de comida**, onde:

- **Clientes** fazem pedidos de restaurantes cadastrados
- **Restaurantes** gerenciam seu cardápio e aceitam/recusam pedidos
- **Entregadores** atualizam o status de entrega em tempo real
- **Administradores** gerenciam toda a plataforma

---

## 🧱 Stack Tecnológica

| Camada             | Tecnologia                          |
| ------------------ | ----------------------------------- |
| Framework          | NestJS 11                           |
| Linguagem          | TypeScript                          |
| ORM                | Sequelize + sequelize-typescript    |
| Banco de dados     | SQLite (dev)                        |
| Autenticação       | JWT + bcrypt                        |
| Validação          | class-validator + class-transformer |
| Documentação       | Swagger (OpenAPI)                   |
| WebSockets         | @nestjs/websockets + socket.io      |
| Filas              | Bull + Redis                        |
| Upload de arquivos | Multer                              |
| Testes             | Jest + Supertest                    |

---

## 📅 Fases do Projeto

```
┌─────────────────────────────────────────────────────┐
│  FASE 0 — Consolidação do Projeto Atual             │
│  Pré-requisito para tudo que vem a seguir           │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  FASE 1 — Delivery MVP                              │
│  Modelos, relacionamentos, CRUD, roles, state machine│
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  FASE 2 — Conceitos Avançados                       │
│  WebSockets, filas, testes, upload                  │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Resumo por Fase

### [Fase 0 — Consolidação](./fase-0-consolidacao.md)

> Fechar as lacunas do projeto atual antes de evoluir.

| #   | Tarefa                    | Conceito Ensinado                          |
| --- | ------------------------- | ------------------------------------------ |
| 0.1 | Validação de DTOs         | `class-validator`, `ValidationPipe` global |
| 0.2 | Filtro global de erros    | `ExceptionFilter`, respostas padronizadas  |
| 0.3 | Documentação com Swagger  | `@nestjs/swagger`, decorators              |
| 0.4 | CRUD completo de usuários | PATCH, DELETE, soft delete                 |
| 0.5 | Roles e autorização       | `enum`, `@Roles()`, `RolesGuard`           |

---

### [Fase 1 — Delivery MVP](./fase-1-delivery-mvp.md)

> Construir o núcleo funcional do sistema de delivery.

| #   | Tarefa                      | Conceito Ensinado                    |
| --- | --------------------------- | ------------------------------------ |
| 1.1 | Model `Restaurant`          | Relacionamentos 1:N                  |
| 1.2 | Model `Product`             | Relacionamentos, enums, validação    |
| 1.3 | Model `Order` + `OrderItem` | Relacionamentos N:M, transações      |
| 1.4 | State Machine de pedidos    | Padrão de estados, lógica de negócio |
| 1.5 | Proteção por roles          | Guards compostos, RBAC               |
| 1.6 | Paginação e filtros         | Query params, DTOs de query          |

---

### [Fase 2 — Conceitos Avançados](./fase-2-avancado.md)

> Adicionar funcionalidades que diferenciam projetos no mercado.

| #   | Tarefa                       | Conceito Ensinado                     |
| --- | ---------------------------- | ------------------------------------- |
| 2.1 | WebSockets para rastreamento | Gateways, eventos, salas (rooms)      |
| 2.2 | Filas com Bull               | Processamento assíncrono, Redis       |
| 2.3 | Testes unitários             | Jest, mocks, spies                    |
| 2.4 | Testes E2E                   | Supertest, banco em memória           |
| 2.5 | Upload de imagens            | Multer, pipes de validação de arquivo |

---

## 🗂️ Estrutura Final Esperada do Projeto

```
src/
├── auth/
│   ├── auth.guard.ts
│   ├── roles.guard.ts          ← novo (Fase 0)
│   └── roles.decorator.ts      ← novo (Fase 0)
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts   ← novo (Fase 0)
│   ├── interceptors/
│   │   └── response.interceptor.ts    ← novo (Fase 0)
│   └── pipes/
│       └── validation.pipe.ts         ← novo (Fase 0)
├── login/
│   ├── login.controller.ts
│   ├── login.module.ts
│   └── login.service.ts
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts         ← refatorado (Fase 0)
│   │   └── update-user.dto.ts         ← novo (Fase 0)
│   ├── users.controller.ts
│   ├── users.module.ts
│   ├── users.service.ts
│   └── userType.ts
├── restaurants/                        ← novo (Fase 1)
│   ├── dto/
│   ├── restaurants.controller.ts
│   ├── restaurants.module.ts
│   └── restaurants.service.ts
├── products/                           ← novo (Fase 1)
│   ├── dto/
│   ├── products.controller.ts
│   ├── products.module.ts
│   └── products.service.ts
├── orders/                             ← novo (Fase 1)
│   ├── dto/
│   ├── orders.controller.ts
│   ├── orders.module.ts
│   ├── orders.service.ts
│   └── order-status.enum.ts
├── models/
│   ├── user.model.ts
│   ├── restaurant.model.ts             ← novo (Fase 1)
│   ├── product.model.ts                ← novo (Fase 1)
│   ├── order.model.ts                  ← novo (Fase 1)
│   └── order-item.model.ts             ← novo (Fase 1)
├── gateways/                           ← novo (Fase 2)
│   └── tracking.gateway.ts
├── notifications/                      ← novo (Fase 2)
│   ├── notifications.module.ts
│   └── notifications.processor.ts
├── app.module.ts
└── main.ts
```

---

## 📖 Como Usar Este Roadmap

1. Leia cada arquivo de fase na ordem
2. Implemente as tarefas **uma por vez**
3. **Não pule fases** — cada fase depende da anterior
4. Use o AI (GitHub Copilot) para tirar dúvidas e gerar boilerplate
5. Sempre rode os testes após cada tarefa concluída

---

## 🎯 Conceitos de Mercado Cobertos ao Final

- [x] Arquitetura modular (NestJS modules)
- [x] Autenticação JWT
- [x] Autorização por papéis (RBAC)
- [x] Validação de entrada de dados
- [x] Tratamento centralizado de erros
- [x] Documentação automática de API
- [x] Relacionamentos entre entidades
- [x] Padrão de State Machine
- [x] Comunicação em tempo real (WebSockets)
- [x] Processamento assíncrono com filas
- [x] Testes unitários e de integração
- [x] Upload e gestão de arquivos
