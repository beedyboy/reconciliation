import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtGuard } from '../guards/jwt.guards';
import { JwtStrategy } from '../guards/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Account } from 'src/entities/account.entity';
import { RefreshTokenStrategy } from 'src/guards/refreshToken.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtGuard, JwtStrategy, RefreshTokenStrategy, Logger],
  exports: [JwtGuard, JwtStrategy, JwtModule, Logger, TypeOrmModule],
})
export class SharedModule {}
