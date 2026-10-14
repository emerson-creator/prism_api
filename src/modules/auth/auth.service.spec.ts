import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn().mockReturnValue('test-refresh-secret'),
  };

  const user = {
    id: 'user-123',
    email: 'jane@example.com',
    name: 'Jane',
    lastName: 'Doe',
    Role: Role.USER,
    password: 'hashed-password',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: user.id,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      Role: user.Role,
    });
    prisma.user.update.mockResolvedValue({});
    configService.getOrThrow.mockReturnValue('test-refresh-secret');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'jane@example.com',
      password: 'Password123',
      name: 'Jane',
      lastName: 'Doe',
    };

    it('registers a user, hashes the password and returns tokens', async () => {
      const result = await service.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          password: 'hashed-value',
          name: registerDto.name,
          lastName: registerDto.lastName,
          Role: Role.USER,
        },
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          Role: true,
          password: false,
        },
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { refreshToken: 'hashed-value' },
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          lastName: user.lastName,
          Role: user.Role,
        },
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('rejects an email that already exists', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(user);

      await expect(service.register(registerDto)).rejects.toThrow(
        'User with this email already exists',
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('wraps registration failures in an internal server error', async () => {
      prisma.user.create.mockRejectedValueOnce(new Error('database failure'));

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: user.email,
      password: 'Password123',
    };

    it('authenticates a user and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(user);

      const result = await service.login(loginDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.password,
      );
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { refreshToken: 'hashed-value' },
      });
      expect(result.user).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        Role: user.Role,
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('rejects an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects an incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(user);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('generates new tokens and stores the hashed refresh token', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        Role: user.Role,
      });

      const result = await service.refresh(user.id);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          Role: true,
        },
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { refreshToken: 'hashed-value' },
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('rejects a user that does not exist', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.refresh(user.id)).rejects.toThrow('User not found');
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token', async () => {
      await service.logout(user.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { refreshToken: null },
      });
    });
  });
});
