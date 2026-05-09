import { AuthRole } from '@/domain/auth/auth-role.enum';

export type AuthenticatedUser = {
  sub: number;
  username: string;
  role: AuthRole;
  academyId: number | null;
  competitionIds: number[];
  exp: number;
};
