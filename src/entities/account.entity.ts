import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 36, unique: true })
  userId: string;

  @Column({ length: 30, nullable: true })
  firstname: string;

  @Column({ length: 30, nullable: true })
  lastname: string;

  @Column({ length: 30, nullable: true })
  username: string;

  @Column({ length: 30, nullable: true })
  position: string;

  @Column('text', { nullable: true })
  address: string;

  @Column({ length: 50, unique: true })
  email: string;

  @Column('text')
  password: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 30, nullable: true })
  home: string;

  @Column('json', { nullable: true })
  roles: any;

  @Column({ default: false })
  hasRoles: boolean;

  @Column('text', { nullable: true })
  token: string;

  @Column({
    type: 'enum',
    enum: ['Active', 'Pending', 'Deleted', 'Banned'],
    default: 'Active',
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateUserId() {
    this.userId = uuidv4();
  }
}
