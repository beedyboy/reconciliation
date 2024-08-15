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
import { Reconciliation } from './reconciliation.entity';

@Entity('audits')
export class Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Reconciliation, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'recon_id' })
  reconciliation: Reconciliation;

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
  cancellation_number: string;

  @Column({ length: 30, nullable: true })
  cancellation_date: string;

  @Column({ length: 30, nullable: true })
  reconcile_date_one: string;

  @Column({ length: 30, nullable: true })
  reconcile_date_two: string;

  @CreateDateColumn() createdAt: Date;

  @UpdateDateColumn() updatedAt: Date;
}
