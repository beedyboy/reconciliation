import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('subcategories')
export class Subcategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, nullable: true })
  name: string;

  @Column({ length: 50, nullable: true })
  slug: string;

  @Column({ length: 100, nullable: true })
  category: string;

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
