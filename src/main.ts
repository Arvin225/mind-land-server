import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformInterceptor } from './common/interceptors/transform/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception/http-exception.filter';
import { writeFileSync } from 'fs';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 注册全局过滤器
  app.useGlobalInterceptors(new TransformInterceptor());
  // 注册全局拦截器
  app.useGlobalFilters(new HttpExceptionFilter())
  // 注册全局验证管道
  app.useGlobalPipes(new ValidationPipe())

  const swaggerOptions = new DocumentBuilder()
    .setTitle('mind-land')
    .setDescription('mind-land api文档')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('api-docs', app, document);
  // 将 Swagger 文档保存为 JSON 文件
  writeFileSync('./swagger.json', JSON.stringify(document, null, 2), 'utf8');

  await app.listen(process.env.PORT ?? 3100);
}
bootstrap();
