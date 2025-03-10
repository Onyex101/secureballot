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
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
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
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    Buffer.from(data)
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
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    Buffer.from(encryptedData, 'base64')
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
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
};

/**
 * Decrypt data with AES key
 */
export const decryptWithAES = (encryptedData: string, iv: string, key: string) => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  
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
