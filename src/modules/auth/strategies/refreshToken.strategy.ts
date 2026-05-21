// Refresh token strategy for validating refresh tokens
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  // Validate the refresh token and return the user data
  async validate(req: Request, payload: { sub: string; email: string }) {
    console.log('Validating refresh token for user:', payload.email);

    console.log('payload:', payload);

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('No authorization header found');
      throw new UnauthorizedException('No authorization header found');
    }

    const refreshToken = authHeader.split(' ')[1];
    if (!refreshToken) {
      console.error('No refresh token found in authorization header');
      throw new UnauthorizedException(
        'No refresh token found in authorization header',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, refreshToken: true, role: true },
    });
    if (!user) {
      console.error('User not found');
      throw new UnauthorizedException('User not found');
    }

    if (user.refreshToken !== refreshToken) {
      console.error('Invalid refresh token');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenValid) {
      console.error('Invalid refresh token');
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
