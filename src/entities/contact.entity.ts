import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60, nullable: true })
  fullname: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 50 })
  email: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: ['Read', 'UnRead', 'Deleted'],
    default: 'UnRead',
  })
  status: string;

  @CreateDateColumn() createdAt: Date;

  @UpdateDateColumn() updatedAt: Date;
}
