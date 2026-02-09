import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  BeforeInsert,
} from 'typeorm';
import { randomBytes } from 'crypto';
import { User } from '../users/user.entity';

@Entity('sketches')
export class Sketch {
  @PrimaryColumn({ length: 36 })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomBytes(5).toString('hex');
    }
  }

  @Column()
  title: string;

  @Column('text')
  code: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'simple-json', nullable: true, default: null })
  codeHistory: Array<{
    id: string;
    messageId: string;
    timestamp: number;
    previousCode: string;
    newCode: string;
    summary?: string;
  }> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.sketches, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;
}
