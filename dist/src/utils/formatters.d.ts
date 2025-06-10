/**
 * Formatting utility functions
 */
/**
 * Format a number with commas as thousands separators
 */
export declare const formatNumber: (num: number) => string;
/**
 * Format a number as currency (NGN)
 */
export declare const formatCurrency: (amount: number, currencyCode?: string) => string;
/**
 * Format a number as a percentage
 */
export declare const formatPercentage: (value: number, decimalPlaces?: number) => string;
/**
 * Format a phone number as +234 XXX XXX XXXX
 */
export declare const formatPhoneNumber: (phoneNumber: string) => string;
/**
 * Format a NIN (National Identification Number)
 */
export declare const formatNIN: (nin: string) => string;
/**
 * Format a VIN (Voter Identification Number)
 */
export declare const formatVIN: (vin: string) => string;
/**
 * Truncate text with ellipsis
 */
export declare const truncateText: (text: string, maxLength: number) => string;
/**
 * Convert string to title case
 */
export declare const toTitleCase: (text: string) => string;
/**
 * Format file size
 */
export declare const formatFileSize: (bytes: number) => string;
