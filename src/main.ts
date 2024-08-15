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
    origin: 'http://localhost:3000',
    credentials: true,
  });
  // app.use(helmet());
  app.use(cookieParser());
  // app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // app.useGlobalFilters(new AllExceptionFilter());

  await app.listen(port, () => {
    Logger.log(`Server running on port ${port}`, 'Main');
  });
}
bootstrap();
