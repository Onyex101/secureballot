/**
 * Date and time utility functions
 */
/**
 * Get current date with time set to start of day (00:00:00)
 */
export declare const getStartOfDay: (date?: Date) => Date;
/**
 * Get current date with time set to end of day (23:59:59.999)
 */
export declare const getEndOfDay: (date?: Date) => Date;
/**
 * Add days to a date
 */
export declare const addDays: (date: Date, days: number) => Date;
/**
 * Add hours to a date
 */
export declare const addHours: (date: Date, hours: number) => Date;
/**
 * Format date to YYYY-MM-DD
 */
export declare const formatDate: (date: Date) => string;
/**
 * Format date and time to YYYY-MM-DD HH:MM:SS
 */
export declare const formatDateTime: (date: Date) => string;
/**
 * Check if a date is in the past
 */
export declare const isPastDate: (date: Date) => boolean;
/**
 * Check if a date is in the future
 */
export declare const isFutureDate: (date: Date) => boolean;
/**
 * Get date from string in YYYY-MM-DD format
 */
export declare const parseDate: (dateString: string) => Date;
/**
 * Get time difference in seconds
 */
export declare const getTimeDifferenceInSeconds: (date1: Date, date2: Date) => number;
/**
 * Get time difference in minutes
 */
export declare const getTimeDifferenceInMinutes: (date1: Date, date2: Date) => number;
/**
 * Get time difference in hours
 */
export declare const getTimeDifferenceInHours: (date1: Date, date2: Date) => number;
/**
 * Get time difference in days
 */
export declare const getTimeDifferenceInDays: (date1: Date, date2: Date) => number;
