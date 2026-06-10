import { Role } from '@prisma/client';

export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    Role?: Role;
    role?: Role;
  };
}
