"use strict";
/**
 * Formatting utility functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFileSize = exports.toTitleCase = exports.truncateText = exports.formatVIN = exports.formatNIN = exports.formatPhoneNumber = exports.formatPercentage = exports.formatCurrency = exports.formatNumber = void 0;
/**
 * Format a number with commas as thousands separators
 */
const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
exports.formatNumber = formatNumber;
/**
 * Format a number as currency (NGN)
 */
const formatCurrency = (amount, currencyCode = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currencyCode,
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
/**
 * Format a number as a percentage
 */
const formatPercentage = (value, decimalPlaces = 2) => {
    return `${(value * 100).toFixed(decimalPlaces)}%`;
};
exports.formatPercentage = formatPercentage;
/**
 * Format a phone number as +234 XXX XXX XXXX
 */
const formatPhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Check if it's a Nigerian number
    if (cleaned.startsWith('234') && cleaned.length === 13) {
        return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
    else if (cleaned.startsWith('0') && cleaned.length === 11) {
        return `+234 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    // Return original if not matching expected format
    return phoneNumber;
};
exports.formatPhoneNumber = formatPhoneNumber;
/**
 * Format a NIN (National Identification Number)
 */
const formatNIN = (nin) => {
    // Remove all non-digit characters
    const cleaned = nin.replace(/\D/g, '');
    // Check if it's a valid NIN (11 digits)
    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    // Return original if not matching expected format
    return nin;
};
exports.formatNIN = formatNIN;
/**
 * Format a VIN (Voter Identification Number)
 */
const formatVIN = (vin) => {
    // Remove all non-alphanumeric characters
    const cleaned = vin.replace(/[^a-zA-Z0-9]/g, '');
    // Check if it's a valid VIN (19 characters)
    if (cleaned.length === 19) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10, 15)}-${cleaned.slice(15)}`;
    }
    // Return original if not matching expected format
    return vin;
};
exports.formatVIN = formatVIN;
/**
 * Truncate text with ellipsis
 */
const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.substring(0, maxLength)}...`;
};
exports.truncateText = truncateText;
/**
 * Convert string to title case
 */
const toTitleCase = (text) => {
    return text.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase());
};
exports.toTitleCase = toTitleCase;
/**
 * Format file size
 */
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
exports.formatFileSize = formatFileSize;
//# sourceMappingURL=formatters.js.map