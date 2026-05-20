// DTO for authentication response

import { Role } from '@prisma/client';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;

  user!: {
    id: string;
    email: string;
    name: string | null;
    lastName: string | null;
    role: Role;
  };
}
