"use strict";
/**
 * Validation utility functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAlphanumeric = exports.isAlpha = exports.isInRange = exports.isEmpty = exports.isValidNumber = exports.isValidDate = exports.isValidUUID = exports.isValidPassword = exports.isValidVIN = exports.isValidNIN = exports.isValidNigerianPhoneNumber = exports.isValidEmail = void 0;
/**
 * Check if a string is a valid email
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
/**
 * Check if a string is a valid Nigerian phone number
 */
const isValidNigerianPhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Check if it's a valid Nigerian number
    // +234 format (13 digits) or 0 format (11 digits)
    return ((cleaned.startsWith('234') && cleaned.length === 13) ||
        (cleaned.startsWith('0') && cleaned.length === 11));
};
exports.isValidNigerianPhoneNumber = isValidNigerianPhoneNumber;
/**
 * Check if a string is a valid NIN (National Identification Number)
 */
const isValidNIN = (nin) => {
    // Remove all non-digit characters
    const cleaned = nin.replace(/\D/g, '');
    // NIN should be 11 digits
    return cleaned.length === 11;
};
exports.isValidNIN = isValidNIN;
/**
 * Check if a string is a valid VIN (Voter Identification Number)
 */
const isValidVIN = (vin) => {
    // Remove all non-alphanumeric characters
    const cleaned = vin.replace(/[^a-zA-Z0-9]/g, '');
    // VIN should be 19 characters
    return cleaned.length === 19;
};
exports.isValidVIN = isValidVIN;
/**
 * Check if a string is a valid password
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};
exports.isValidPassword = isValidPassword;
/**
 * Check if a string is a valid UUID
 */
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};
exports.isValidUUID = isValidUUID;
/**
 * Check if a value is a valid date
 */
const isValidDate = (date) => {
    if (date instanceof Date) {
        return !isNaN(date.getTime());
    }
    if (typeof date === 'string') {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime());
    }
    return false;
};
exports.isValidDate = isValidDate;
/**
 * Check if a value is a valid number
 */
const isValidNumber = (value) => {
    if (typeof value === 'number') {
        return !isNaN(value);
    }
    if (typeof value === 'string') {
        return !isNaN(Number(value));
    }
    return false;
};
exports.isValidNumber = isValidNumber;
/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
const isEmpty = (value) => {
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
exports.isEmpty = isEmpty;
/**
 * Check if a value is within a range
 */
const isInRange = (value, min, max) => {
    return value >= min && value <= max;
};
exports.isInRange = isInRange;
/**
 * Check if a string contains only letters
 */
const isAlpha = (value) => {
    return /^[a-zA-Z]+$/.test(value);
};
exports.isAlpha = isAlpha;
/**
 * Check if a string contains only letters and numbers
 */
const isAlphanumeric = (value) => {
    return /^[a-zA-Z0-9]+$/.test(value);
};
exports.isAlphanumeric = isAlphanumeric;
//# sourceMappingURL=validation.js.map