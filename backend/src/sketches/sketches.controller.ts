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
import { CreateSketchDto } from './dto/create-sketch.dto';
import { UpdateSketchDto } from './dto/update-sketch.dto';

@Controller('api/sketches')
export class SketchesController {
  constructor(private sketchesService: SketchesService) {}

  @Get('public/:id')
  findOnePublic(@Param('id') id: string) {
    return this.sketchesService.findOnePublic(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateSketchDto,
  ) {
    return this.sketchesService.create(user.sub, dto);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll(@CurrentUser() user: { sub: string }) {
    return this.sketchesService.findAllByUser(user.sub);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.sketchesService.findOne(id, user.sub);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateSketchDto,
  ) {
    return this.sketchesService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.sketchesService.remove(id, user.sub);
  }
}
