import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(1, 64)
  username: string;

  @IsString()
  @Length(1, 128)
  password: string;
}

export class RefreshDto {
  @IsString()
  @Length(20, 200)
  refreshToken: string;
}
