import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  password: string;
}
