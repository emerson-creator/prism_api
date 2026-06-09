import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User unique identifier',
  })
  id!: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  email!: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  firstName!: string | null;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  lastName!: string | null;

  @ApiProperty({ description: 'User role', example: 'user', enum: Role })
  Role!: Role;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'User account creation date',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'User account last update date',
  })
  updatedAt!: Date;
}
