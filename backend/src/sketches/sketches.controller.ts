import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SketchesService } from './sketches.service';
import type { CreateSketchDto } from './dto/create-sketch.dto';
import type { UpdateSketchDto } from './dto/update-sketch.dto';

@Controller('api/sketches')
@UseGuards(AuthGuard)
export class SketchesController {
  constructor(private sketchesService: SketchesService) {}

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateSketchDto,
  ) {
    return this.sketchesService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { sub: string }) {
    return this.sketchesService.findAllByUser(user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.sketchesService.findOne(id, user.sub);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateSketchDto,
  ) {
    return this.sketchesService.update(id, user.sub, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.sketchesService.remove(id, user.sub);
  }
}
