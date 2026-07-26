export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  mobile: string | null;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
