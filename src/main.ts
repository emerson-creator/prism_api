import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';

async function bootstrap() {
  // bodyParser: false porque vamos a controlar manualmente el parseo,
  // ya que Stripe necesita el body crudo (sin parsear) para validar
  // la firma del webhook.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.setGlobalPrefix('api/v1');

  // Middleware específico para el webhook: guarda el buffer crudo en
  // req.rawBody antes de parsear. Debe registrarse con el path COMPLETO
  // (incluyendo el prefijo global), porque app.use() no aplica el
  // setGlobalPrefix automáticamente como sí lo hace el ruteo de Nest.
  app.use(
    '/api/v1/payments/webhook',
    json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Parser normal para el resto de la app.
  app.use(json());

  // set Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // set CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowHeaders: 'Content-Type, Accept, Authorization',
  });

  // Enable swagger docs
  const config = new DocumentBuilder()
    .setTitle('E-commerce API')
    .setDescription('API documentation for the E-commerce application')
    .addTag('auth')
    .addTag('users')
    .addTag('products')
    .addApiKey(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'Authorization',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'refreshToken',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'accessToken',
    )
    .addSecurityRequirements('Authorization')
    .addSecurityRequirements('refreshToken')
    .addSecurityRequirements('accessToken')
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Local server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
  process.exit(1);
});
