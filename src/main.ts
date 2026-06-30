import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos não declarados no DTO
      forbidNonWhitelisted: true, // lança erro se campos extras forem enviados
      transform: true, // converte tipos automaticamente (ex: string -> number)
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

 const config = new DocumentBuilder()
    .setTitle('Delivery API')
    .setDescription('API do sistema de delivery')
    .setVersion('1.0')
    .addBearerAuth() // adiciona o campo de token JWT na UI
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableCors();

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();