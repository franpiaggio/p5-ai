import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CodeHistoryEntryDto {
  @IsString()
  id: string;

  @IsString()
  messageId: string;

  @IsNumber()
  timestamp: number;

  @IsString()
  @MaxLength(500_000)
  previousCode: string;

  @IsString()
  @MaxLength(500_000)
  newCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;
}

export class UpdateSketchDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CodeHistoryEntryDto)
  codeHistory?: CodeHistoryEntryDto[];
}
