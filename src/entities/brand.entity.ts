import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true, nullable: true })
  name: string;

  @Column('text', { nullable: true })
  description: string;

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
