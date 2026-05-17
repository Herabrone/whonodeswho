import { IsEmail, MinLength } from 'class-validator';

export class AuthCredentialsDto {
  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;
}
