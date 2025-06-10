import crypto from 'crypto';

/**
 * Generate RSA key pair
 */
export const generateKeyPair = () => {
  // Generate RSA key pair
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
export const encryptWithPublicKey = (data: string, publicKey: string) => {
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
export const decryptWithPrivateKey = (encryptedData: string, privateKey: string) => {
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
 * Generate AES key
 */
export const generateAESKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Encrypt data with AES key
 */
export const encryptWithAES = (data: string, key: string) => {
  const iv = crypto.randomBytes(16);

  let keyBuffer: Buffer;
  try {
    keyBuffer = Buffer.from(key, 'hex');
  } catch (error) {
    throw error;
  }

  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);

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
export const decryptWithAES = (encryptedData: string, iv: string, key: string) => {
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
export const hashData = (data: string) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Get encryption key from environment or generate default
 */
const getEncryptionKey = (): string => {
  // In production, this should come from environment variables or a secure key management system
  const envKey = process.env.IDENTITY_ENCRYPTION_KEY;

  if (envKey) {
    // Convert the environment key to a proper 32-byte hex key
    // Hash the environment key to get exactly 32 bytes (64 hex chars)
    const hashedKey = crypto.createHash('sha256').update(envKey).digest('hex');
    return hashedKey;
  }

  // Fallback key (should be replaced in production)
  return 'a'.repeat(64);
};

/**
 * Encrypt NIN or VIN for secure storage
 */
export const encryptIdentity = (identity: string): string => {
  try {
    const key = getEncryptionKey();
    const result = encryptWithAES(identity, key);

    // Combine IV and encrypted data for storage
    return `${result.iv}:${result.encryptedData}`;
  } catch (error) {
    throw new Error(`Failed to encrypt identity: ${(error as Error).message}`);
  }
};

/**
 * Decrypt NIN or VIN for verification
 */
export const decryptIdentity = (encryptedIdentity: string): string => {
  try {
    const [iv, encryptedData] = encryptedIdentity.split(':');
    if (!iv || !encryptedData) {
      throw new Error('Invalid encrypted identity format');
    }

    const key = getEncryptionKey();
    return decryptWithAES(encryptedData, iv, key);
  } catch (error) {
    throw new Error(`Failed to decrypt identity: ${(error as Error).message}`);
  }
};

/**
 * Hash NIN or VIN for fast lookup (using bcrypt for security)
 */
export const hashIdentity = async (identity: string): Promise<string> => {
  const bcrypt = await import('bcrypt');
  const saltRounds = 12; // Higher rounds for sensitive identity data
  return bcrypt.hash(identity, saltRounds);
};

/**
 * Verify NIN or VIN against its hash
 */
export const verifyIdentity = async (identity: string, hash: string): Promise<boolean> => {
  try {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(identity, hash);
  } catch (error) {
    return false;
  }
};

/**
 * Generate a secure fingerprint for identity verification
 */
export const generateIdentityFingerprint = (nin: string, vin: string): string => {
  // Create a unique fingerprint that doesn't reveal the actual values
  const combined = `${nin}:${vin}`;
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
};
