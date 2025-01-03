import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { SharedModule } from 'src/utils/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from 'src/entities/card.entity';
import { CardActivity } from 'src/entities/card-activity.entity';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Card, CardActivity])],
  providers: [CardService],
  controllers: [CardController],
})
export class CardModule {}
