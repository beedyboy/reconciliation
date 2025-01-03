import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { CardActivity } from './card-activity.entity';

@Entity()
export class Card {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  barcode: string;

  @Column({ unique: true })
  referenceNumber: string;

  @Column({ default: 'inactive' })
  status: 'active' | 'inactive' | 'suspended';

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true, unique: true })
  phoneNumber: string;

  @Column('float', { default: 0 })
  loaded: number;

  @Column('float', { default: 0 })
  balance: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  activatedAt: Date;

  @OneToMany(() => CardActivity, (activity) => activity.card)
  activities: CardActivity[];
}
