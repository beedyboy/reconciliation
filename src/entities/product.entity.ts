import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Subcategory } from './subcategory.entity';
import { Brand } from './brand.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, nullable: true })
  category: string;

  @ManyToOne(() => Subcategory, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'sub_id' })
  subcategory: Subcategory;

  @ManyToOne(() => Brand, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ length: 50, nullable: true })
  product_name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['Active', 'Pending', 'Deleted'],
    default: 'Active',
  })
  status: string;

  @Column('json', { nullable: true })
  images: any;

  @Column({ default: false })
  has_name: boolean;

  @Column({ default: false })
  branded: boolean;

  @Column({ default: false })
  best: boolean;

  @Column({ default: false })
  arrival: boolean;

  @Column({ default: false })
  featured: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
