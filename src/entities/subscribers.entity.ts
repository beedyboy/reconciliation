import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('subscribers')
export class Subscriber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  email: string;

  @Column({
    type: 'enum',
    enum: ['Active', 'Pending', 'Deleted'],
    default: 'Active',
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
