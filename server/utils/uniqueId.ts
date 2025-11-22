import { randomBytes } from "crypto";

/**
 * Generate a unique user ID in the format: prefix_XXXX
 * @param prefix - The prefix for the ID (e.g., "vasukii")
 * @param length - Number of random characters (default: 4)
 * @returns A unique ID like "vasukii_3942"
 */
export function generateUniqueId(prefix: string = "vasukii", length: number = 4): string {
  const randomPart = randomBytes(length)
    .toString('hex')
    .slice(0, length)
    .toLowerCase();
  
  return `${prefix}_${randomPart}`;
}

/**
 * Generate a unique ID with a custom prefix
 * @param customPrefix - Custom prefix for the ID
 * @returns A unique ID with the custom prefix
 */
export function generateCustomUniqueId(customPrefix: string): string {
  // Clean the prefix to only allow alphanumeric and underscores
  const cleanPrefix = customPrefix.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  
  if (cleanPrefix.length < 2) {
    throw new Error("Prefix must be at least 2 characters long");
  }
  
  if (cleanPrefix.length > 15) {
    throw new Error("Prefix must be 15 characters or less");
  }
  
  return generateUniqueId(cleanPrefix, 4);
}

/**
 * Check if a unique ID is available
 * @param uniqueId - The ID to check
 * @param existingIds - Array of existing IDs
 * @returns True if the ID is available
 */
export function isUniqueIdAvailable(uniqueId: string, existingIds: string[]): boolean {
  return !existingIds.includes(uniqueId);
}
