/**
 * Date and time utility functions
 */

/**
 * Get current date with time set to start of day (00:00:00)
 */
export const getStartOfDay = (date: Date = new Date()): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * Get current date with time set to end of day (23:59:59.999)
 */
export const getEndOfDay = (date: Date = new Date()): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

/**
 * Add days to a date
 */
export const addDays = (date: Date, days: number): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

/**
 * Add hours to a date
 */
export const addHours = (date: Date, hours: number): Date => {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
};

/**
 * Format date to YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Format date and time to YYYY-MM-DD HH:MM:SS
 */
export const formatDateTime = (date: Date): string => {
  return date.toISOString().replace('T', ' ').substring(0, 19);
};

/**
 * Check if a date is in the past
 */
export const isPastDate = (date: Date): boolean => {
  return date.getTime() < new Date().getTime();
};

/**
 * Check if a date is in the future
 */
export const isFutureDate = (date: Date): boolean => {
  return date.getTime() > new Date().getTime();
};

/**
 * Get date from string in YYYY-MM-DD format
 */
export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * Get time difference in seconds
 */
export const getTimeDifferenceInSeconds = (date1: Date, date2: Date): number => {
  return Math.abs(date1.getTime() - date2.getTime()) / 1000;
};

/**
 * Get time difference in minutes
 */
export const getTimeDifferenceInMinutes = (date1: Date, date2: Date): number => {
  return getTimeDifferenceInSeconds(date1, date2) / 60;
};

/**
 * Get time difference in hours
 */
export const getTimeDifferenceInHours = (date1: Date, date2: Date): number => {
  return getTimeDifferenceInMinutes(date1, date2) / 60;
};

/**
 * Get time difference in days
 */
export const getTimeDifferenceInDays = (date1: Date, date2: Date): number => {
  return getTimeDifferenceInHours(date1, date2) / 24;
};
