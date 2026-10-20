import type { BaseRecord } from './common';

export type Role = 'admin' | 'shop';

export interface User extends BaseRecord {
  email: string;
  name: string;
  role: Role;
  /** null for admin (global access); set for shop accounts. */
  shopId: string | null;
  avatarUrl: string | null;
  phone: string | null;
  active: boolean;
  lastLoginAt: string | null;
}

/**
 * Stand-in for a credentials table. Passwords live in plain text only because
 * this is a mock; swapping in Supabase Auth removes this type entirely.
 */
export interface Credential {
  userId: string;
  email: string;
  password: string;
}

export interface Session {
  user: User;
  issuedAt: string;
  expiresAt: string;
}
