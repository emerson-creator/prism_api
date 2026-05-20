// DTO for authentication response

import { Role } from '@prisma/client';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;

  user!: {
    id: number;
    email: string;
    name: string;
    lastName: string;
    role: Role;
  };
}
