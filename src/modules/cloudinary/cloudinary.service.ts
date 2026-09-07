import { Injectable, BadRequestException } from '@nestjs/common';
import { UploadApiResponse } from 'cloudinary';
import { configureCloudinary } from './cloudinary.config';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CloudinaryService {
  private readonly cloudinary = configureCloudinary();

  /**
   * Uploads an in-memory file buffer (from Multer's memoryStorage) to
   * Cloudinary using an upload stream, so we never write the file to
   * disk on our own server first.
   */
  async uploadImage(
    file: { buffer: Buffer; mimetype: string; size: number },
    folder = 'prism/products',
  ): Promise<{ url: string; publicId: string }> {
    if (!file) {
      throw new BadRequestException('No file was provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File is too large. Max size is 5MB.');
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          // Cap dimensions and auto-optimize so we never store/serve
          // an unnecessarily huge product photo.
          transformation: [
            { width: 1600, height: 1600, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            return reject(
              error instanceof Error
                ? error
                : new Error('Cloudinary upload failed'),
            );
          }
          resolve(uploadResult);
        },
      );
      stream.end(file.buffer);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  /** Deletes an image by its Cloudinary public_id (used when replacing/removing a product photo). */
  async deleteImage(publicId: string): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId);
  }
}
