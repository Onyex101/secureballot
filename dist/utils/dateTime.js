"use strict";
/**
 * Date and time utility functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeDifferenceInDays = exports.getTimeDifferenceInHours = exports.getTimeDifferenceInMinutes = exports.getTimeDifferenceInSeconds = exports.parseDate = exports.isFutureDate = exports.isPastDate = exports.formatDateTime = exports.formatDate = exports.addHours = exports.addDays = exports.getEndOfDay = exports.getStartOfDay = void 0;
/**
 * Get current date with time set to start of day (00:00:00)
 */
const getStartOfDay = (date = new Date()) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
};
exports.getStartOfDay = getStartOfDay;
/**
 * Get current date with time set to end of day (23:59:59.999)
 */
const getEndOfDay = (date = new Date()) => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
};
exports.getEndOfDay = getEndOfDay;
/**
 * Add days to a date
 */
const addDays = (date, days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};
exports.addDays = addDays;
/**
 * Add hours to a date
 */
const addHours = (date, hours) => {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
};
exports.addHours = addHours;
/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};
exports.formatDate = formatDate;
/**
 * Format date and time to YYYY-MM-DD HH:MM:SS
 */
const formatDateTime = (date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19);
};
exports.formatDateTime = formatDateTime;
/**
 * Check if a date is in the past
 */
const isPastDate = (date) => {
    return date.getTime() < new Date().getTime();
};
exports.isPastDate = isPastDate;
/**
 * Check if a date is in the future
 */
const isFutureDate = (date) => {
    return date.getTime() > new Date().getTime();
};
exports.isFutureDate = isFutureDate;
/**
 * Get date from string in YYYY-MM-DD format
 */
const parseDate = (dateString) => {
    return new Date(dateString);
};
exports.parseDate = parseDate;
/**
 * Get time difference in seconds
 */
const getTimeDifferenceInSeconds = (date1, date2) => {
    return Math.abs(date1.getTime() - date2.getTime()) / 1000;
};
exports.getTimeDifferenceInSeconds = getTimeDifferenceInSeconds;
/**
 * Get time difference in minutes
 */
const getTimeDifferenceInMinutes = (date1, date2) => {
    return (0, exports.getTimeDifferenceInSeconds)(date1, date2) / 60;
};
exports.getTimeDifferenceInMinutes = getTimeDifferenceInMinutes;
/**
 * Get time difference in hours
 */
const getTimeDifferenceInHours = (date1, date2) => {
    return (0, exports.getTimeDifferenceInMinutes)(date1, date2) / 60;
};
exports.getTimeDifferenceInHours = getTimeDifferenceInHours;
/**
 * Get time difference in days
 */
const getTimeDifferenceInDays = (date1, date2) => {
    return (0, exports.getTimeDifferenceInHours)(date1, date2) / 24;
};
exports.getTimeDifferenceInDays = getTimeDifferenceInDays;
//# sourceMappingURL=dateTime.js.map