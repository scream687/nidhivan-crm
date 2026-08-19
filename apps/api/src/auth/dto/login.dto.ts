import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  // Strength rules belong on register/reset-password, not sign-in. Enforcing them
  // here rejects any account whose password predates the policy before credentials
  // are ever checked, and leaks the policy to unauthenticated callers.
  @IsString()
  @IsNotEmpty()
  password!: string;
}
