import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from 'src/entities/account.entity';
import { SharedModule } from 'src/utils/shared.module';
import { RefreshTokenStrategy } from 'src/guards/refreshToken.strategy';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([Account]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '260m' },
    }),
  ],
  controllers: [AccountController],
  providers: [AccountService, RefreshTokenStrategy],
})
export class AccountModule {}
