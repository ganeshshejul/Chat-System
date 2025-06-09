import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js';

// Simple in-memory cache for username checking (fallback)
const usernameCache = new Set();

/**
 * Fallback username checking using local cache
 * @param {string} username - The username to check
 * @returns {boolean} - True if available, false if taken
 */
const checkUsernameLocalFallback = (username) => {
  // Check against common reserved usernames
  const reservedUsernames = [
    'admin', 'administrator', 'root', 'user', 'guest', 'test', 'demo',
    'api', 'www', 'mail', 'email', 'support', 'help', 'info', 'contact',
    'about', 'privacy', 'terms', 'login', 'signup', 'register', 'profile',
    'settings', 'dashboard', 'home', 'index', 'main', 'app', 'system'
  ];

  if (reservedUsernames.includes(username.toLowerCase())) {
    return false;
  }

  // Check against our local cache
  return !usernameCache.has(username.toLowerCase());
};

/**
 * Add username to local cache
 * @param {string} username - The username to cache
 */
const addUsernameToCache = (username) => {
  if (username) {
    usernameCache.add(username.toLowerCase());
  }
};

/**
 * Check if a username is available
 * @param {string} username - The username to check
 * @returns {Promise<boolean>} - True if available, false if taken
 */
export const checkUsernameAvailability = async (username) => {
  if (!username || username.length < 3) {
    return false;
  }

  try {
    console.log('Checking username availability for:', username);

    // Check if db is properly initialized
    if (!db) {
      console.error('Firestore database not initialized');
      throw new Error('Database not available');
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);

    console.log('Username check result - empty:', querySnapshot.empty, 'size:', querySnapshot.size);
    return querySnapshot.empty; // True if no documents found (username available)
  } catch (error) {
    console.error('Error checking username availability:', error);

    // If it's a permission error or index error, use fallback checking
    if (error.code === 'permission-denied' ||
        error.code === 'failed-precondition' ||
        error.message.includes('index') ||
        error.message.includes('requires an index')) {
      console.warn('Database query failed, using fallback checking for:', username);
      return checkUsernameLocalFallback(username);
    }

    // For other errors, use fallback as well
    console.warn('Database error, using fallback checking for:', username, error.message);
    return checkUsernameLocalFallback(username);
  }
};

/**
 * Generate a unique username based on display name
 * @param {string} displayName - The display name to base username on
 * @returns {Promise<string>} - A unique username
 */
export const generateUniqueUsername = async (displayName) => {
  if (!displayName) {
    displayName = 'user';
  }

  // Clean the display name to create a base username
  let baseUsername = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
    .substring(0, 15); // Limit length

  if (baseUsername.length < 3) {
    baseUsername = 'user' + baseUsername;
  }

  // Check if base username is available
  if (await checkUsernameAvailability(baseUsername)) {
    return baseUsername;
  }

  // If not available, try with numbers
  for (let i = 1; i <= 999; i++) {
    const candidateUsername = baseUsername + i;
    if (await checkUsernameAvailability(candidateUsername)) {
      return candidateUsername;
    }
  }

  // If still not found, use timestamp
  const timestamp = Date.now().toString().slice(-6);
  return baseUsername + timestamp;
};

/**
 * Validate username format
 * @param {string} username - The username to validate
 * @returns {Object} - Validation result with isValid and message
 */
export const validateUsername = (username) => {
  if (!username) {
    return { isValid: false, message: 'Username is required' };
  }

  if (username.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters long' };
  }

  if (username.length > 20) {
    return { isValid: false, message: 'Username must be no more than 20 characters long' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }

  if (/^[0-9]/.test(username)) {
    return { isValid: false, message: 'Username cannot start with a number' };
  }

  return { isValid: true, message: 'Username is valid' };
};

/**
 * Find user by username or email
 * @param {string} identifier - Username or email
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export const findUserByIdentifier = async (identifier) => {
  if (!identifier) return null;

  try {
    const usersRef = collection(db, 'users');

    // First try to find by username (only if identifier doesn't contain @)
    if (!identifier.includes('@')) {
      try {
        const usernameQuery = query(usersRef, where('username', '==', identifier.toLowerCase()));
        const usernameSnapshot = await getDocs(usernameQuery);

        if (!usernameSnapshot.empty) {
          const userDoc = usernameSnapshot.docs[0];
          const userData = userDoc.data();
          return {
            uid: userDoc.id,
            ...userData
          };
        }
      } catch (usernameError) {
        // If it's an index error, try a different approach
        if (usernameError.message.includes('index') || usernameError.code === 'failed-precondition') {
          try {
            // Get all users and search manually (less efficient but works without index)
            const allUsersSnapshot = await getDocs(usersRef);
            for (const userDoc of allUsersSnapshot.docs) {
              const userData = userDoc.data();
              if (userData.username && userData.username.toLowerCase() === identifier.toLowerCase()) {
                return {
                  uid: userDoc.id,
                  ...userData
                };
              }
            }
          } catch (manualError) {
            console.error('Manual username search failed:', manualError);
          }
        }
        // Continue to email search if username query fails
      }
    }

    // Try to find by email
    try {
      const emailQuery = query(usersRef, where('email', '==', identifier.toLowerCase()));
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        const userDoc = emailSnapshot.docs[0];
        return {
          uid: userDoc.id,
          ...userDoc.data()
        };
      }
    } catch (emailError) {
      console.error('Email query failed:', emailError.message);
      throw emailError;
    }

    return null;
  } catch (error) {
    console.error('Error finding user by identifier:', error);

    // Provide specific guidance for permission errors
    if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
      throw new Error('Database access denied. Please ensure Firestore security rules are properly configured. See FIRESTORE_SETUP.md for instructions.');
    }

    throw new Error(`Failed to find user: ${error.message}`);
  }
};

/**
 * Get username suggestions based on display name
 * @param {string} displayName - The display name to base suggestions on
 * @returns {Promise<string[]>} - Array of available username suggestions
 */
export const getUsernameSuggestions = async (displayName) => {
  if (!displayName) return [];

  const suggestions = [];
  const baseUsername = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);

  if (baseUsername.length < 3) {
    return [];
  }

  // Generate different variations
  const variations = [
    baseUsername,
    baseUsername + '_',
    baseUsername + '123',
    baseUsername + '2024',
    'the_' + baseUsername,
    baseUsername + '_user'
  ];

  for (const variation of variations) {
    if (suggestions.length >= 5) break;
    
    try {
      if (await checkUsernameAvailability(variation)) {
        suggestions.push(variation);
      }
    } catch (error) {
      console.error('Error checking suggestion:', variation, error);
    }
  }

  return suggestions;
};
