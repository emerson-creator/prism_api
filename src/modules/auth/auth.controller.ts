import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UseGuards } from '@nestjs/common';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { AuthResponseDto, LogoutResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Register api
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: 'User registered', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return await this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Access token refreshed',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing refresh token' })
  async refresh(@GetUser('id') userId: string): Promise<AuthResponseDto> {
    return await this.authService.refresh(userId);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'User logged out', type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async logout(@GetUser('id') userId: string): Promise<LogoutResponseDto> {
    await this.authService.logout(userId);

    return { message: 'Logged out successfully' };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'User logged in', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    const authResponse = await this.authService.login(loginDto);
    return {
      ...authResponse,
    };
  }
}
