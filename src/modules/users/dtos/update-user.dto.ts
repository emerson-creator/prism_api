import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  IsEnum,
} from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;

  @ApiPropertyOptional({ enum: Role, example: 'USER' })
  @IsOptional()
  @IsEnum(Role, { message: 'Invalid role' })
  role?: Role;

  @ApiPropertyOptional({ example: 'NewPass123', description: 'New password' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/, {
    message: 'Password must contain at least one letter and one number',
  })
  password?: string;
}
