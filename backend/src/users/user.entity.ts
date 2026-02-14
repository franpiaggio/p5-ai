import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Sketch } from '../sketches/sketch.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  googleId: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ nullable: true, select: false })
  password: string;

  @Column()
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ default: false })
  storeApiKeys: boolean;

  @Column({ nullable: true, select: false })
  encryptedApiKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Sketch, (sketch) => sketch.user)
  sketches: Sketch[];
}
