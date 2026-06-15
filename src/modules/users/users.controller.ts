import { Controller } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
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
import { ChangePasswordDto } from './dtos/change-password.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Delete } from '@nestjs/common';

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

  // change current user password
  @Patch('profile/password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
  })
  async changePassword(
    @GetUser('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(id, changePasswordDto);
    return { message: 'Password changed successfully.' };
  }

  // Delete current user account
  @Delete('profile')
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({
    status: 200,
    description: 'User account deleted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
  })
  async deleteUser(@GetUser('id') id: string): Promise<{ message: string }> {
    await this.usersService.delete(id);
    return { message: 'User account deleted successfully.' };
  }

  // Admin delete user by id
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin delete user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User account deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  async adminDeleteUser(@Param('id') id: string): Promise<{ message: string }> {
    await this.usersService.delete(id);
    return { message: 'User account deleted successfully.' };
  }
}
