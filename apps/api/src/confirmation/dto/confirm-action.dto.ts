import { IsString, MinLength } from 'class-validator';

export class ConfirmActionDto {
  @IsString()
  @MinLength(1)
  token!: string;
}
