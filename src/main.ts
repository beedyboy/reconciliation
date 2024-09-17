import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(3000);
// }
// bootstrap();

const port = process.env.PORT || 8000;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Access-Token',
      'x-api-key',
    ],
    origin: [
      'http://localhost:3000',
      'https://mybagswarehouse.com',
      'https://admin.mybagswarehouse.com',
    ],
    credentials: true,
    methods: 'GET, PUT, PATCH, POST, DELETE, OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 200,
    exposedHeaders: ['Content-Length', 'x-api-key'],
  });
  // app.use(helmet());
  app.use((req, res, next) => {
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Access-Token, x-api-key',
    );
    next();
  });
  app.use(cookieParser());
  // app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // app.useGlobalFilters(new AllExceptionFilter());

  await app.listen(port, () => {
    Logger.log(`Server running on port ${port}`, 'Main');
  });
}
bootstrap();
