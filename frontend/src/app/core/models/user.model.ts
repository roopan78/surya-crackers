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
  /** Set while the account is switched off; the 90-day deletion clock starts here. */
  deactivatedAt?: string | null;
  /** Who switched it off — a customer may undo their own by signing in, an admin's stands. */
  deactivationSource?: 'SELF' | 'ADMIN' | null;
  createdAt?: string;
  updatedAt?: string;
}
