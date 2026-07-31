import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsNumber,
  ValidateNested,
  MaxLength,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImageAttachmentDto {
  @IsString()
  @MaxLength(14_000_000) // ~10MB base64
  base64: string;

  @IsIn(['image/png', 'image/jpeg'])
  mimeType: 'image/png' | 'image/jpeg';
}

export class MessageDto {
  @IsString()
  id: string;

  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(100_000)
  content: string;

  @IsNumber()
  timestamp: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAttachmentDto)
  @ArrayMaxSize(4)
  images?: ImageAttachmentDto[];
}

export class LLMConfigDto {
  @IsIn(['openai', 'anthropic', 'deepseek', 'demo', 'opencode'])
  provider: 'openai' | 'anthropic' | 'deepseek' | 'demo' | 'opencode';

  @IsString()
  @MaxLength(200)
  model: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;
}

export class ChatFileDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(500_000)
  content: string;
}

export class ChatLibraryDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(2000)
  url: string;
}

export class ChatRequestDto {
  @IsString()
  @MaxLength(100_000)
  message: string;

  @IsString()
  @MaxLength(500_000)
  code: string;

  @IsOptional()
  @IsIn(['javascript', 'typescript'])
  language?: 'javascript' | 'typescript';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  @ArrayMaxSize(50)
  history: MessageDto[];

  @ValidateNested()
  @Type(() => LLMConfigDto)
  config: LLMConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAttachmentDto)
  @ArrayMaxSize(4)
  images?: ImageAttachmentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatFileDto)
  @ArrayMaxSize(20)
  files?: ChatFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatLibraryDto)
  @ArrayMaxSize(20)
  libraries?: ChatLibraryDto[];
}

export class ListModelsDto {
  @IsString()
  @MaxLength(50)
  provider: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;
}
