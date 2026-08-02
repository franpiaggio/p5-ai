import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * One row per (subject, UTC day) tracking how many free/demo chat messages that
 * subject has spent that day. Free usage runs on the operator's shared provider
 * keys, so it is rationed. The subject is `u:<userId>` for a logged-in user or
 * `ip:<address>` for an anonymous caller (a lower daily cap); BYOK requests never
 * touch this table.
 */
@Entity('usage_daily')
export class UsageDaily {
  @PrimaryColumn()
  subject: string;

  /** UTC calendar day, `YYYY-MM-DD`. */
  @PrimaryColumn()
  day: string;

  @Column({ default: 0 })
  count: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
