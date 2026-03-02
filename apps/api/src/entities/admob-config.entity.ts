import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('admob_config')
export class AdmobConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'boolean', default: true })
  testMode: boolean;

  // Android
  @Column({ type: 'text', nullable: true })
  androidAppId: string | null;

  @Column({ type: 'text', nullable: true })
  bannerAndroid: string | null;

  @Column({ type: 'text', nullable: true })
  interstitialAndroid: string | null;

  @Column({ type: 'text', nullable: true })
  rewardedAndroid: string | null;

  // iOS
  @Column({ type: 'text', nullable: true })
  iosAppId: string | null;

  @Column({ type: 'text', nullable: true })
  bannerIos: string | null;

  @Column({ type: 'text', nullable: true })
  interstitialIos: string | null;

  @Column({ type: 'text', nullable: true })
  rewardedIos: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
