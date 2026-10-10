export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  mobile: string | null;
  role: Role;
  isActive?: boolean;
  /** True while the password is the one the API generated and emailed (Google sign-up). */
  passwordIsTemporary?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
