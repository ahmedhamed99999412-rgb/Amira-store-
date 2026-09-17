import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const DEV_JWT_SECRET = 'dev-secret-change-in-production';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return DEV_JWT_SECRET;
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = 'amira_session';

// Hash a password using bcrypt with salt rounds of 10
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify a password against a bcrypt hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Validate Egyptian phone number: 11 digits starting with 01[0125]
// Valid prefixes: 010, 011, 012, 015 (all Egyptian mobile operators)
export function isValidEgyptianPhone(phone: string): boolean {
  return /^01[0125][0-9]{8}$/.test(phone.trim());
}

// Validate username: 3-30 chars, alphanumeric + underscore only
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username.trim());
}

// Create a JWT token for a user (contains userId + role)
export function createToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

// Verify a JWT token and return the payload (or null if invalid/expired)
export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; role: string };
    return decoded;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
