import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sketch } from './sketch.entity';
import { SketchesController } from './sketches.controller';
import { SketchesService } from './sketches.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sketch]), AuthModule],
  controllers: [SketchesController],
  providers: [SketchesService],
})
export class SketchesModule {}
