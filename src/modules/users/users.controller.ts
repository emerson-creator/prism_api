import { Controller } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth-guards';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsersService } from './users.service';
import { Get, Req } from '@nestjs/common';
import { UserResponseDto } from './dtos/user-response.dto';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Param } from '@nestjs/common';
import { Patch } from '@nestjs/common';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Body } from '@nestjs/common';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get current profile
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
  })
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
  })
  getProfile(@Req() req: RequestWithUser): Promise<UserResponseDto> {
    return this.usersService.findOne(req.user.id);
  }

  // get all users (admin only)
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully.',
  })
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersService.getAllUsers();
    return users;
  }

  // get user by id (admin only)
  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    return user;
  }

  // Upadte user profile
  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
  })
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() updateData: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(req.user.id, updateData);
  }
}
