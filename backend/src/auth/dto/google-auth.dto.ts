import { IsString, MaxLength } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @MaxLength(5000)
  credential: string;
}
