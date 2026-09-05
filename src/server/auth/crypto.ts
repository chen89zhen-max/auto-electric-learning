import crypto from 'node:crypto';

const SCRYPT_PREFIX = 'scrypt$v1$';
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'nev_electrical_game_salt_2026';

/**
 * Hashes a plaintext password using crypto.scrypt with a unique 16-byte random salt.
 * Returns formatted string: scrypt$v1$<salt_hex>$<hash_hex>
 */
export function hashPassword(password: string): string {
  const salt = Buffer.from(crypto.randomBytes(16)).toString('hex');
  const derivedKey = Buffer.from(crypto.scryptSync(password, salt, 64));
  return `${SCRYPT_PREFIX}${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash using timingSafeEqual
 * to prevent side-channel timing attacks.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  if (storedHash.startsWith(SCRYPT_PREFIX)) {
    const parts = storedHash.slice(SCRYPT_PREFIX.length).split('$');
    if (parts.length !== 2) return false;
    const [salt, expectedHashHex] = parts;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expectedHashHex, 'hex');
    if (derivedKey.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, expectedBuffer);
  }

  // Fallback for legacy unmigrated plaintext passwords (constant time check)
  const a = Buffer.from(password);
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Generates a SHA-256 hash of a session token for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Anonymously hashes an IP address for privacy-compliant rate limiting and auditing.
 */
export function hashIp(ip: string): string {
  const cleanIp = (ip || '127.0.0.1').trim();
  return crypto.createHash('sha256').update(`${cleanIp}:${IP_HASH_SALT}`).digest('hex');
}

/**
 * Generates a cryptographically strong random token.
 */
export function generateSecureToken(bytes = 32): string {
  return Buffer.from(crypto.randomBytes(bytes)).toString('hex');
}

/**
 * Generates a strong, random temporary password for password resets.
 */
export function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
