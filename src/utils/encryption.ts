/**
 * Encryption utility functions
 */
import crypto from 'crypto';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

/**
 * Generate a random token
 */
export const generateRandomToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a password using bcrypt
 */
export const hashPassword = (password: string, saltRounds: number = 12): Promise<string> => {
  return bcrypt.hash(password, saltRounds);
};

/**
 * Verify a password against a hash
 */
export const verifyPassword = (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate a JWT token
 */
export const generateJwtToken = (
  payload: Record<string, any>,
  secret: string = process.env.JWT_SECRET || 'default-secret-key',
  expiresIn: string = '1h',
): string => {
  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };

  return jwt.sign(payload, secret as Secret, options);
};

/**
 * Verify a JWT token
 */
export const verifyJwtToken = (
  token: string,
  secret: string = process.env.JWT_SECRET || 'default-secret-key',
): any => {
  try {
    return jwt.verify(token, secret as Secret);
  } catch (error) {
    return null;
  }
};

/**
 * Generate an RSA key pair
 */
export const generateRsaKeyPair = (): { publicKey: string; privateKey: string } => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
};

/**
 * Encrypt data with RSA public key
 */
export const encryptWithPublicKey = (data: string, publicKey: string): string => {
  const encryptedData = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    Buffer.from(data),
  );

  return encryptedData.toString('base64');
};

/**
 * Decrypt data with RSA private key
 */
export const decryptWithPrivateKey = (encryptedData: string, privateKey: string): string => {
  const decryptedData = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    Buffer.from(encryptedData, 'base64'),
  );

  return decryptedData.toString();
};

/**
 * Generate an AES key
 */
export const generateAesKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Encrypt data with AES key
 */
export const encryptWithAes = (
  data: string,
  key: string,
): { iv: string; encryptedData: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
  };
};

/**
 * Decrypt data with AES key
 */
export const decryptWithAes = (encryptedData: string, iv: string, key: string): string => {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex'),
  );

  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

/**
 * Hash data with SHA-256
 */
export const hashData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate a secure random number
 */
export const generateSecureRandomNumber = (min: number, max: number): number => {
  const range = max - min;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const randomBytes = crypto.randomBytes(bytesNeeded);

  let randomValue = 0;
  for (let i = 0; i < bytesNeeded; i++) {
    randomValue = randomValue * 256 + randomBytes[i];
  }

  return min + Math.floor((randomValue / maxValue) * range);
};
