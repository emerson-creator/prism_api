import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsController', () => {
  let controller: ProductsController;

  let productsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    updateStock: jest.Mock;
    remove: jest.Mock;
  };

  let cloudinaryService: {
    uploadImage: jest.Mock;
  };

  beforeEach(async () => {
    productsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStock: jest.fn(),
      remove: jest.fn(),
    };

    cloudinaryService = {
      uploadImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: productsService,
        },
        {
          provide: CloudinaryService,
          useValue: cloudinaryService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates product creation to the service', async () => {
      const dto = {
        name: 'Keyboard',
        description: 'Mechanical keyboard',
        price: 79.99,
        stock: 10,
        sku: 'KEYBOARD-001',
        categoryId: 'category-1',
      } as CreateProductDto;

      const expected = { id: 'product-1', name: 'Keyboard' };
      productsService.create.mockResolvedValue(expected);

      await expect(controller.create(dto)).resolves.toBe(expected);
      expect(productsService.create).toHaveBeenCalledWith(dto);
    });

    it('propagates service errors', async () => {
      const error = new Error('Creation failed');
      productsService.create.mockRejectedValue(error);

      await expect(controller.create({} as CreateProductDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('uploadImage', () => {
    it('delegates the uploaded file to Cloudinary', async () => {
      const file = {
        originalname: 'keyboard.png',
        mimetype: 'image/png',
        buffer: Buffer.from('image'),
        size: 5,
      } as Express.Multer.File;

      const expected = { imageUrl: 'https://example.com/keyboard.png' };
      cloudinaryService.uploadImage.mockResolvedValue(expected);

      await expect(controller.uploadImage(file)).resolves.toBe(expected);
      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(file);
    });

    it('propagates Cloudinary errors', async () => {
      const error = new Error('Image upload failed');
      cloudinaryService.uploadImage.mockRejectedValue(error);

      await expect(
        controller.uploadImage({} as Express.Multer.File),
      ).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    it('passes query filters and pagination to the service', async () => {
      const query = {
        category: 'Electronics',
        isActive: true,
        search: 'keyboard',
        page: 2,
        limit: 5,
      } as QueryProductsDto;

      const expected = {
        data: [{ id: 'product-1' }],
        meta: { totalItems: 1, page: 2, limit: 5, totalPages: 1 },
      };

      productsService.findAll.mockResolvedValue(expected);

      await expect(controller.findAll(query)).resolves.toBe(expected);
      expect(productsService.findAll).toHaveBeenCalledWith(query);
    });

    it('propagates service errors', async () => {
      const error = new Error('Query failed');
      productsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll({} as QueryProductsDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('passes the product ID to the service', async () => {
      const expected = { id: 'product-1', name: 'Keyboard' };
      productsService.findOne.mockResolvedValue(expected);

      await expect(controller.findOne('product-1')).resolves.toBe(expected);
      expect(productsService.findOne).toHaveBeenCalledWith('product-1');
    });
  });

  describe('update', () => {
    it('passes the product ID and update DTO to the service', async () => {
      const dto = { price: 89.99 } as UpdateProductDto;
      const expected = { id: 'product-1', price: 89.99 };
      productsService.update.mockResolvedValue(expected);

      await expect(controller.update('product-1', dto)).resolves.toBe(expected);

      expect(productsService.update).toHaveBeenCalledWith('product-1', dto);
    });
  });

  describe('updateStock', () => {
    it('passes the product ID and quantity to the service', async () => {
      const expected = { id: 'product-1', stock: 15 };
      productsService.updateStock.mockResolvedValue(expected);

      await expect(controller.updateStock('product-1', 5)).resolves.toBe(
        expected,
      );

      expect(productsService.updateStock).toHaveBeenCalledWith('product-1', 5);
    });
  });

  describe('remove', () => {
    it('passes the product ID to the service', async () => {
      const expected = { id: 'product-1', name: 'Keyboard' };
      productsService.remove.mockResolvedValue(expected);

      await expect(controller.remove('product-1')).resolves.toBe(expected);
      expect(productsService.remove).toHaveBeenCalledWith('product-1');
    });
  });
});
