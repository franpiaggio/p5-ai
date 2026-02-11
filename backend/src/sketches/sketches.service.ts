import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sketch } from './sketch.entity';
import { CreateSketchDto } from './dto/create-sketch.dto';
import { UpdateSketchDto } from './dto/update-sketch.dto';

@Injectable()
export class SketchesService {
  constructor(
    @InjectRepository(Sketch)
    private sketchesRepository: Repository<Sketch>,
  ) {}

  async create(userId: string, dto: CreateSketchDto): Promise<Sketch> {
    const sketch = this.sketchesRepository.create({
      ...dto,
      userId,
    });
    return this.sketchesRepository.save(sketch);
  }

  async findAllByUser(userId: string): Promise<Sketch[]> {
    return this.sketchesRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      select: ['id', 'title', 'description', 'thumbnail', 'createdAt', 'updatedAt'],
    });
  }

  async findOnePublic(id: string): Promise<Partial<Sketch>> {
    const sketch = await this.sketchesRepository.findOne({
      where: { id },
      select: ['id', 'title', 'code', 'description', 'thumbnail', 'codeHistory', 'createdAt', 'updatedAt'],
    });
    if (!sketch) throw new NotFoundException('Sketch not found');
    return sketch;
  }

  async findOne(id: string, userId: string): Promise<Sketch> {
    const sketch = await this.sketchesRepository.findOne({ where: { id } });
    if (!sketch) throw new NotFoundException('Sketch not found');
    if (sketch.userId !== userId) throw new ForbiddenException();
    return sketch;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateSketchDto,
  ): Promise<Sketch> {
    const sketch = await this.findOne(id, userId);
    Object.assign(sketch, dto);
    return this.sketchesRepository.save(sketch);
  }

  async remove(id: string, userId: string): Promise<void> {
    const sketch = await this.findOne(id, userId);
    await this.sketchesRepository.remove(sketch);
  }
}
