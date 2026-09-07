import { ApiProperty } from '@nestjs/swagger';

export class UploadImageResponseDto {
  @ApiProperty({
    description:
      'The public URL of the uploaded image (use this as Product.imageUrl)',
    example:
      'https://res.cloudinary.com/ddf2ubc9l/image/upload/v1234567890/prism/products/abc123.jpg',
  })
  url!: string;

  @ApiProperty({
    description:
      'Cloudinary public ID, needed if the image is ever deleted or replaced',
    example: 'prism/products/abc123',
  })
  publicId!: string;
}
