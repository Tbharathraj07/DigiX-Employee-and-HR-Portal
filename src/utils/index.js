// ==============================================================================
// DigiX Technologies - General Utility Functions
// File: src/utils/index.js
// ==============================================================================

/**
 * Combines conditional class names into a single string.
 * Filters out falsy values (null, undefined, false, empty string).
 * 
 * @param  {...(string|boolean|undefined|null)} classes
 * @returns {string} Joined class name string
 */
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Format a date object or ISO string into a human-readable display string.
 *
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  return d.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Capitalizes the first letter of a string.
 *
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Safely truncates a string with an ellipsis if it exceeds max length.
 *
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export const truncate = (str, maxLength = 50) => {
  if (!str || str.length <= maxLength) return str || '';
  return `${str.slice(0, maxLength)}...`;
};

// Re-export directory mapper for convenience
export { mapDbDirectoryEntryToUi } from '../lib/directoryMapper.js';
