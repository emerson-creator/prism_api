import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  let prisma: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const user = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test',
    lastName: 'User',
    Role: 'USER',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  const databaseUser = {
    ...user,
    password: 'current-hash',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns a user by ID without exposing the password', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.findOne('user-1')).resolves.toEqual(user);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          Role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllUsers', () => {
    it('returns users without exposing their passwords', async () => {
      prisma.user.findMany.mockResolvedValue([user]);

      await expect(service.getAllUsers()).resolves.toEqual([user]);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          Role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('returns an empty array when there are no users', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await expect(service.getAllUsers()).resolves.toEqual([]);
    });
  });

  describe('update', () => {
    it('updates an existing user', async () => {
      const updateData = { name: 'Updated' };
      prisma.user.findUnique.mockResolvedValue(databaseUser);
      prisma.user.update.mockResolvedValue({ ...user, ...updateData });

      await expect(
        service.update('user-1', updateData as any),
      ).resolves.toEqual({ ...user, ...updateData });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          Role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'Updated' } as any),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects an email already used by another user', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(databaseUser)
        .mockResolvedValueOnce({ id: 'user-2', email: 'taken@example.com' });

      await expect(
        service.update('user-1', { email: 'taken@example.com' } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('does not perform a duplicate-email lookup when the email is unchanged', async () => {
      prisma.user.findUnique.mockResolvedValue(databaseUser);
      prisma.user.update.mockResolvedValue(user);

      await service.update('user-1', { email: user.email } as any);

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const dto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    };

    it('hashes and saves a new password when validation succeeds', async () => {
      prisma.user.findUnique.mockResolvedValue(databaseUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');
      prisma.user.update.mockResolvedValue({});

      await expect(
        service.changePassword('user-1', dto as any),
      ).resolves.toBeUndefined();

      expect(bcrypt.compare).toHaveBeenNthCalledWith(
        1,
        dto.currentPassword,
        databaseUser.password,
      );
      expect(bcrypt.compare).toHaveBeenNthCalledWith(
        2,
        dto.newPassword,
        databaseUser.password,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.newPassword, 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'new-password-hash' },
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('missing', dto as any),
      ).rejects.toThrow(NotFoundException);

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects an incorrect current password', async () => {
      prisma.user.findUnique.mockResolvedValue(databaseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.changePassword('user-1', dto as any),
      ).rejects.toThrow(BadRequestException);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      prisma.user.findUnique.mockResolvedValue(databaseUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      await expect(
        service.changePassword('user-1', dto as any),
      ).rejects.toThrow(BadRequestException);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes an existing user', async () => {
      prisma.user.findUnique.mockResolvedValue(databaseUser);
      prisma.user.delete.mockResolvedValue(databaseUser);

      await expect(service.delete('user-1')).resolves.toBeUndefined();

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
