import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { AccountModule } from './account/account.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DashboardModule } from './dashboard/dashboard.module';
import { TransactionProcessingModule } from './transaction-processing/transaction-processing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DATABASE_NAME,
      synchronize: process.env.SYNCHRONIZE ? true : false,
      logging: ['error', 'info', 'warn'],
      autoLoadEntities: true,
      entities: ['dist/**/*.entity.js'],
    }),
    ReconciliationModule,
    AccountModule,
    DashboardModule,
    TransactionProcessingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
