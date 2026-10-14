import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  let usersService: {
    findOne: jest.Mock;
    getAllUsers: jest.Mock;
    update: jest.Mock;
    changePassword: jest.Mock;
    delete: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test',
    lastName: 'User',
    Role: 'USER',
  };

  beforeEach(async () => {
    usersService = {
      findOne: jest.fn(),
      getAllUsers: jest.fn(),
      update: jest.fn(),
      changePassword: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('returns the authenticated user profile', async () => {
      usersService.findOne.mockResolvedValue(user);

      await expect(
        controller.getProfile({ user } as any),
      ).resolves.toBe(user);

      expect(usersService.findOne).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getAllUsers', () => {
    it('returns all users from the service', async () => {
      usersService.getAllUsers.mockResolvedValue([user]);

      await expect(controller.getAllUsers()).resolves.toEqual([user]);

      expect(usersService.getAllUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserById', () => {
    it('passes the requested user ID to the service', async () => {
      usersService.findOne.mockResolvedValue(user);

      await expect(
        controller.getUserById('user-1'),
      ).resolves.toBe(user);

      expect(usersService.findOne).toHaveBeenCalledWith('user-1');
    });

    it('propagates service errors', async () => {
      const error = new Error('User not found');
      usersService.findOne.mockRejectedValue(error);

      await expect(controller.getUserById('missing')).rejects.toBe(error);
    });
  });

  describe('updateProfile', () => {
    it('updates the authenticated user profile', async () => {
      const dto = { name: 'Updated' };
      usersService.update.mockResolvedValue({ ...user, ...dto });

      await expect(
        controller.updateProfile({ user } as any, dto as any),
      ).resolves.toEqual({ ...user, ...dto });

      expect(usersService.update).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('adminUpdateUser', () => {
    it('updates the user specified by the administrator', async () => {
      const dto = { name: 'Updated' };
      usersService.update.mockResolvedValue({ ...user, ...dto });

      await expect(
        controller.adminUpdateUser('user-2', dto as any),
      ).resolves.toEqual({ ...user, ...dto });

      expect(usersService.update).toHaveBeenCalledWith('user-2', dto);
    });
  });

  describe('changePassword', () => {
    it('changes the authenticated user password and returns a message', async () => {
      const dto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };
      usersService.changePassword.mockResolvedValue(undefined);

      await expect(
        controller.changePassword('user-1', dto as any),
      ).resolves.toEqual({
        message: 'Password changed successfully.',
      });

      expect(usersService.changePassword).toHaveBeenCalledWith('user-1', dto);
    });

    it('propagates password-change errors', async () => {
      const error = new Error('Current password is incorrect');
      usersService.changePassword.mockRejectedValue(error);

      await expect(
        controller.changePassword('user-1', {
          currentPassword: 'wrong',
          newPassword: 'NewPassword456!',
        } as any),
      ).rejects.toBe(error);
    });
  });

  describe('deleteUser', () => {
    it('deletes the authenticated user account', async () => {
      usersService.delete.mockResolvedValue(undefined);

      await expect(controller.deleteUser('user-1')).resolves.toEqual({
        message: 'User account deleted successfully.',
      });

      expect(usersService.delete).toHaveBeenCalledWith('user-1');
    });
  });

  describe('adminDeleteUser', () => {
    it('deletes the user specified by the administrator', async () => {
      usersService.delete.mockResolvedValue(undefined);

      await expect(
        controller.adminDeleteUser('user-2'),
      ).resolves.toEqual({
        message: 'User account deleted successfully.',
      });

      expect(usersService.delete).toHaveBeenCalledWith('user-2');
    });

    it('propagates service errors', async () => {
      const error = new Error('User not found');
      usersService.delete.mockRejectedValue(error);

      await expect(controller.adminDeleteUser('missing')).rejects.toBe(error);
    });
  });
});
