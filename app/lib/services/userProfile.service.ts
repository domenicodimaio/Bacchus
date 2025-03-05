/**
 * User Profile Service
 * 
 * Manages user profiles for BAC calculations
 * This is a compatibility layer to redirect to profile.service.ts
 */

import { getProfileById } from './profile.service';

/**
 * Get a user profile by ID
 * This is a wrapper around the profile.service's getProfileById
 */
export function getUserProfileById(id) {
  return getProfileById(id);
}

// For CommonJS compatibility
module.exports = {
  getUserProfileById
}; 