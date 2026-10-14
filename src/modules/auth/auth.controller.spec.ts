import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const authResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      id: 'user-123',
      email: 'jane@example.com',
      name: 'Jane',
      lastName: 'Doe',
      Role: Role.USER,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    authService.register.mockResolvedValue(authResponse);
    authService.login.mockResolvedValue(authResponse);
    authService.refresh.mockResolvedValue(authResponse);
    authService.logout.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('delegates registration to AuthService and returns its response', async () => {
      const dto = {
        email: 'jane@example.com',
        password: 'Password123',
        name: 'Jane',
        lastName: 'Doe',
      };

      await expect(controller.register(dto)).resolves.toEqual(authResponse);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('delegates login to AuthService and returns its response', async () => {
      const dto = {
        email: 'jane@example.com',
        password: 'Password123',
      };

      await expect(controller.login(dto)).resolves.toEqual(authResponse);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    it('passes the authenticated user ID to AuthService', async () => {
      await expect(controller.refresh('user-123')).resolves.toEqual(
        authResponse,
      );

      expect(authService.refresh).toHaveBeenCalledWith('user-123');
      expect(authService.refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('logs out the authenticated user and returns a confirmation', async () => {
      await expect(controller.logout('user-123')).resolves.toEqual({
        message: 'Logged out successfully',
      });

      expect(authService.logout).toHaveBeenCalledWith('user-123');
      expect(authService.logout).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from AuthService', async () => {
      authService.logout.mockRejectedValueOnce(new Error('Database failure'));

      await expect(controller.logout('user-123')).rejects.toThrow(
        'Database failure',
      );
    });
  });
});
