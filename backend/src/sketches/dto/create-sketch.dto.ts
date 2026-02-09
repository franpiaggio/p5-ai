import { IsString, IsOptional, MaxLength } from 'class-validator';

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
}
