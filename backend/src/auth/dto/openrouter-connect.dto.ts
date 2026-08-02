import { IsString, MaxLength, MinLength } from 'class-validator';

export class OpenRouterConnectDto {
  @IsString()
  @MaxLength(1000)
  code: string;

  @IsString()
  @MinLength(20)
  @MaxLength(256)
  codeVerifier: string;
}
