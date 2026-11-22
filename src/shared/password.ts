import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 32;

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, passwordHash: string): boolean => {
  const [salt, hash] = passwordHash.split(':');

  if (!salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, KEY_LENGTH);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
};
