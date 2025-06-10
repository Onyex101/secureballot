/**
 * Validation utility functions
 */
/**
 * Check if a string is a valid email
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * Check if a string is a valid Nigerian phone number
 */
export declare const isValidNigerianPhoneNumber: (phoneNumber: string) => boolean;
/**
 * Check if a string is a valid NIN (National Identification Number)
 */
export declare const isValidNIN: (nin: string) => boolean;
/**
 * Check if a string is a valid VIN (Voter Identification Number)
 */
export declare const isValidVIN: (vin: string) => boolean;
/**
 * Check if a string is a valid password
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export declare const isValidPassword: (password: string) => boolean;
/**
 * Check if a string is a valid UUID
 */
export declare const isValidUUID: (uuid: string) => boolean;
/**
 * Check if a value is a valid date
 */
export declare const isValidDate: (date: any) => boolean;
/**
 * Check if a value is a valid number
 */
export declare const isValidNumber: (value: any) => boolean;
/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export declare const isEmpty: (value: any) => boolean;
/**
 * Check if a value is within a range
 */
export declare const isInRange: (value: number, min: number, max: number) => boolean;
/**
 * Check if a string contains only letters
 */
export declare const isAlpha: (value: string) => boolean;
/**
 * Check if a string contains only letters and numbers
 */
export declare const isAlphanumeric: (value: string) => boolean;
