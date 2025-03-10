/**
 * Validation utility functions
 */

/**
 * Check if a string is a valid email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if a string is a valid Nigerian phone number
 */
export const isValidNigerianPhoneNumber = (phoneNumber: string): boolean => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a valid Nigerian number
  // +234 format (13 digits) or 0 format (11 digits)
  return (
    (cleaned.startsWith('234') && cleaned.length === 13) ||
    (cleaned.startsWith('0') && cleaned.length === 11)
  );
};

/**
 * Check if a string is a valid NIN (National Identification Number)
 */
export const isValidNIN = (nin: string): boolean => {
  // Remove all non-digit characters
  const cleaned = nin.replace(/\D/g, '');
  
  // NIN should be 11 digits
  return cleaned.length === 11;
};

/**
 * Check if a string is a valid VIN (Voter Identification Number)
 */
export const isValidVIN = (vin: string): boolean => {
  // Remove all non-alphanumeric characters
  const cleaned = vin.replace(/[^a-zA-Z0-9]/g, '');
  
  // VIN should be 19 characters
  return cleaned.length === 19;
};

/**
 * Check if a string is a valid password
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const isValidPassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Check if a string is a valid UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Check if a value is a valid date
 */
export const isValidDate = (date: any): boolean => {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }
  
  return false;
};

/**
 * Check if a value is a valid number
 */
export const isValidNumber = (value: any): boolean => {
  if (typeof value === 'number') {
    return !isNaN(value);
  }
  
  if (typeof value === 'string') {
    return !isNaN(Number(value));
  }
  
  return false;
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
};

/**
 * Check if a value is within a range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Check if a string contains only letters
 */
export const isAlpha = (value: string): boolean => {
  return /^[a-zA-Z]+$/.test(value);
};

/**
 * Check if a string contains only letters and numbers
 */
export const isAlphanumeric = (value: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(value);
};
