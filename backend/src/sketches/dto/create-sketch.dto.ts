import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SketchFileDto {
  @IsString()
  id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(500_000)
  content: string;

  @IsString()
  @MaxLength(20)
  language: string;
}

class LibraryDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(2000)
  url: string;
}

export class CreateSketchDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(500_000)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  thumbnail?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SketchFileDto)
  files?: SketchFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LibraryDto)
  libraries?: LibraryDto[];
}
