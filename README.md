# Delivery API

API NestJS para cadastro de usuarios, restaurantes, produtos e pedidos.

## Desenvolvimento local

```bash
npm install
npm run start
```

Por padrao, sem variaveis de ambiente, a API ainda usa `database.sqlite`. Como o projeto agora usa BullMQ, esse modo tambem espera um Redis em `localhost:6379`. Para subir tudo pronto, prefira o Docker Compose.

## Rodando com Docker Compose

```bash
docker compose up --build
```

A API fica em `http://localhost:3000` e a documentacao Swagger em `http://localhost:3000/api/docs`.

Servicos locais:

- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin: `http://localhost:5050`

Credenciais locais do pgAdmin:

- E-mail: `admin@example.com`
- Senha: `admin`

Para conectar o pgAdmin ao banco, crie um server com:

- Host: `postgres`
- Port: `5432`
- Database: `delivery`
- Username: `delivery`
- Password: `delivery`

## Variaveis de ambiente

Use `.env.example` como referencia.

- `PORT`: porta HTTP. No Render ela e injetada automaticamente.
- `DATABASE_URL`: URL de conexao PostgreSQL.
- `DB_DIALECT`: use `postgres` em producao.
- `DB_SYNC`: mantem o Sequelize criando/alterando tabelas automaticamente. Para producao real, prefira migrations e use `false`.
- `DB_SSL`: use `true` quando conectar em um Postgres que exige SSL.
- `JWT_SECRET`: segredo usado para assinar tokens.
- `REDIS_URL`: URL do Redis para filas/cache/sessoes.
- `QUEUE_ENABLED`: use `false` para iniciar a API sem BullMQ quando Redis ainda nao estiver configurado.


## Filas com BullMQ

O projeto usa BullMQ com Redis para processar tarefas assincronas. O CRUD principal continua gravando direto no Postgres; depois que um pedido e criado, a API adiciona um job `order.created` na fila `order-events`.

Esse worker hoje registra o evento no log, e pode ser evoluido em aula para enviar notificacoes, e-mails, webhooks, metricas ou outras tarefas que nao precisam bloquear a resposta da API. Em producao, a fila so e ativada automaticamente quando `REDIS_URL` ou `REDIS_HOST` estiver configurado.

## Deploy no Render

O arquivo `render.yaml` cria:

- Um Web Service Docker para a API.
- Um PostgreSQL gerenciado.
- Um Render Key Value gerenciado, compativel com Redis.

No Render, crie um Blueprint apontando para este repositorio. O Render vai construir a imagem usando o `Dockerfile` e injetar `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` e `PORT`.

Sobre pgAdmin no Render: e possivel rodar como outro Web Service Docker usando a imagem `dpage/pgadmin4`, mas para uma API de alunos normalmente e melhor deixar pgAdmin so local ou protegido por credenciais fortes, porque ele expoe uma interface administrativa do banco.

## Testes

```bash
npm run test
npm run test:e2e
npm run test:cov
```
