import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageDaily } from './usage.entity';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsageDaily])],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
