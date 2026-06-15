// DTO for category response
import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the category',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string = '';

  @ApiProperty({
    description: 'Name of the category',
    example: 'Electronics',
  })
  name: string = '';

  @ApiProperty({
    description: 'Description of the category',
    example: 'All kinds of electronic devices and gadgets.',
  })
  description: string | null = null;

  @ApiProperty({
    description: 'URL-friendly slug for the category',
    example: 'electronics',
  })
  slug: string | null = null;

  @ApiProperty({
    description: 'URL of the category image',
    example: 'https://example.com/images/electronics.jpg',
  })
  imageUrl: string | null = null;

  @ApiProperty({
    description: 'Indicates if the category is active',
    example: true,
  })
  isActive: boolean = true;

  @ApiProperty({
    description: 'Number of products in this category',
    example: 42,
  })
  productCount: number = 0;

  @ApiProperty({
    description: 'Timestamp when the category was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date = new Date();

  @ApiProperty({
    description: 'Timestamp when the category was last updated',
    example: '2024-01-02T00:00:00.000Z',
  })
  updatedAt: Date = new Date();
}
