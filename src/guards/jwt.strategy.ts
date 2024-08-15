import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from 'src/entities/account.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Account) private authRepository: Repository<Account>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }
  async validate(payload: any) {
    // console.log('payload', payload);
    const userId = payload.user.userId;
    const user = await this.authRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User does not exist');
    }
    return payload.user;
  }
}
