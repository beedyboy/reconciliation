import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { Account } from './account.entity';
import { CardActivityType } from 'src/dtos/card.dto';

@Entity()
export class CardActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: CardActivityType })
  activity_type: CardActivityType;

  @ManyToOne(() => Card, (card) => card.id, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    eager: true,
  })
  @JoinColumn()
  card: Card;

  @Column('float', { default: 0 })
  amount: number;

  @Column({ default: null, nullable: true })
  status: string;

  @Column({ default: null, nullable: true })
  requested_by: string;

  @ManyToOne(() => Account, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn()
  approved_by: Account;

  @ManyToOne(() => Account, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn()
  rejected_by: Account;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  timestamp: Date;
}
