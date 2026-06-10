// Data transfer object for user registration
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: 'Password123' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/, {
    message: 'Password must contain at least one letter and one number',
  })
  password!: string;

  @ApiProperty({ example: 'Jane', required: false })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name!: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName!: string;

  @ApiProperty({ enum: Role, example: Role.USER, required: false })
  @IsOptional()
  @IsEnum(Role, { message: 'Invalid role' })
  Role?: Role;
}
