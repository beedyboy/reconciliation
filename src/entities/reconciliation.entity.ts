import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';

@Entity('reconciliations')
export class Reconciliation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  value_date: string;

  @Column('text', { nullable: true })
  remarks: string;

  @Column('float')
  credit_amount: number;

  @Column('float', { nullable: true })
  amount_used: number;

  @Column('float', { nullable: true })
  balance: number;

  @Column({ length: 50, nullable: true })
  customer: string;

  @Column({ default: false })
  approved_one: boolean;

  @Column({ default: false })
  approved_two: boolean;

  @ManyToOne(() => Account, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'approval_one' })
  approvalOne: Account;

  @ManyToOne(() => Account, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'approval_two' })
  approvalTwo: Account;

  @Column({ length: 30, nullable: true })
  reference: string;

  @Column({ length: 30, nullable: true })
  way_bill_number: string;

  @ManyToOne(() => Account, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'approval_two' })
  overTurnedBy: Account;

  @Column({ length: 30, nullable: true })
  cancellation_number: string;

  @Column({ length: 30, nullable: true })
  cancellation_date: string;

  @Column({ length: 30, nullable: true })
  reconcile_date_one: string;

  @Column({ length: 30, nullable: true })
  reconcile_date_two: string;

  @Column({ nullable: true })
  parent_id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
