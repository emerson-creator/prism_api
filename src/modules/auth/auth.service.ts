import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email };
    const refreshId = randomBytes(64).toString('hex');
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync({ ...payload, refreshId }, { expiresIn: '7d' }),
    ]);
    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  // Register a new user
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    try {
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          lastName,
        },
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          role: true,
          password: false, // Exclude password from the response
        },
      });

      const tokens = await this.generateTokens(user.id.toString(), user.email);

      await this.updateRefreshToken(user.id.toString(), tokens.refreshToken);

      return {
        ...tokens,
        user,
      };
    } catch (error: any) {
      console.error('Error during registration:', error);
      throw new InternalServerErrorException(
        'An error occurred during registration',
      );
    }
  }
}
