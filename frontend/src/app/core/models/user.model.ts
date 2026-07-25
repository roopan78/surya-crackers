export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  mobile: string;
  name: string | null;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
