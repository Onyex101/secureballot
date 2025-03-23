/**
 * Formatting utility functions
 */

/**
 * Format a number with commas as thousands separators
 */
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format a number as currency (NGN)
 */
export const formatCurrency = (amount: number, currencyCode: string = 'NGN'): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
};

/**
 * Format a number as a percentage
 */
export const formatPercentage = (value: number, decimalPlaces: number = 2): string => {
  return `${(value * 100).toFixed(decimalPlaces)}%`;
};

/**
 * Format a phone number as +234 XXX XXX XXXX
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Check if it's a Nigerian number
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+234 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  // Return original if not matching expected format
  return phoneNumber;
};

/**
 * Format a NIN (National Identification Number)
 */
export const formatNIN = (nin: string): string => {
  // Remove all non-digit characters
  const cleaned = nin.replace(/\D/g, '');

  // Check if it's a valid NIN (11 digits)
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }

  // Return original if not matching expected format
  return nin;
};

/**
 * Format a VIN (Voter Identification Number)
 */
export const formatVIN = (vin: string): string => {
  // Remove all non-alphanumeric characters
  const cleaned = vin.replace(/[^a-zA-Z0-9]/g, '');

  // Check if it's a valid VIN (19 characters)
  if (cleaned.length === 19) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10, 15)}-${cleaned.slice(15)}`;
  }

  // Return original if not matching expected format
  return vin;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Convert string to title case
 */
export const toTitleCase = (text: string): string => {
  return text.replace(
    /\w\S*/g,
    word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase(),
  );
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
