import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';

const SALT_ROUNDS = 12;

/**
 * Alphabet for generated passwords. Uppercase and digits only, with B I L O S
 * and 0 1 5 dropped: exactly one of each confusable pair survives, so nothing
 * here can be misread as something else when it is retyped out of an email.
 */
const TEMP_PASSWORD_ALPHABET = 'ACDEFGHJKMNPQRTUVWXYZ2346789';
const TEMP_PASSWORD_LENGTH = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * A random password we generate on the customer's behalf (Google sign-up), mail
 * to them, and expect them to replace. Grouped in fours purely so it is easy to
 * read off an email; the dashes are part of the password.
 */
export function generateTemporaryPassword(): string {
  const characters = Array.from(
    { length: TEMP_PASSWORD_LENGTH },
    () => TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)],
  ).join('');

  return (characters.match(/.{1,4}/g) ?? [characters]).join('-');
}
