import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { generateUniqueUsername } from './usernameUtils.js';

/**
 * Creates or updates a user profile in Firestore
 * @param {Object} user - The Firebase Auth user object
 * @param {string} username - Optional username for new users
 * @returns {Promise<void>}
 */
export const createOrUpdateUserProfile = async (user, username = null) => {
  if (!user) return;

  try {
    console.log('Creating/updating user profile for:', user.uid, user.displayName, user.email, 'with username parameter:', username);

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    // If user document doesn't exist, create it
    if (!userDoc.exists()) {
      console.log('Creating new user profile');

      // Generate username if not provided
      let finalUsername = username;
      if (!finalUsername) {
        finalUsername = await generateUniqueUsername(user.displayName || user.email);
        console.log('Generated username:', finalUsername);
      } else {
        console.log('Using provided username:', finalUsername);
      }

      const userData = {
        displayName: user.displayName || 'User',
        displayNameLower: (user.displayName || 'User').toLowerCase(),
        username: finalUsername,
        email: user.email || '',
        photoURL: user.photoURL || '',
        emailVerified: user.emailVerified || false,
        createdAt: new Date(),
        lastActive: new Date()
      };

      console.log('User data to be saved:', userData);
      await setDoc(userRef, userData);

      console.log('User profile created successfully');
    } else {
      console.log('Updating existing user profile');

      // Get existing data
      const existingData = userDoc.data();
      console.log('Existing user data:', existingData);

      // Determine the username to use
      let finalUsername = existingData.username; // Preserve existing username first

      // If no existing username, use the provided username or generate one
      if (!finalUsername) {
        finalUsername = username || await generateUniqueUsername(user.displayName || user.email);
        console.log('No existing username found, using/generating:', finalUsername);
      } else {
        console.log('Preserving existing username:', finalUsername);
      }

      // Update user data with any missing fields
      const updates = {
        displayName: user.displayName || existingData.displayName || 'User',
        displayNameLower: (user.displayName || existingData.displayName || 'User').toLowerCase(),
        username: finalUsername,
        email: user.email || existingData.email || '',
        emailVerified: user.emailVerified !== undefined ? user.emailVerified : existingData.emailVerified || false,
        lastActive: new Date()
      };

      console.log('Updates to be applied:', updates);
      await setDoc(userRef, updates, { merge: true });

      console.log('User profile updated successfully');
    }

    // Verify the user profile was created/updated correctly
    const verifyDoc = await getDoc(userRef);
    if (verifyDoc.exists()) {
      console.log('Verified user profile:', verifyDoc.data());
    } else {
      console.error('Failed to verify user profile creation');
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);

    // Provide specific guidance for permission errors
    if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
      throw new Error('Database access denied. Please ensure Firestore security rules are properly configured. See FIRESTORE_SETUP.md for instructions.');
    }

    throw error;
  }
};

/**
 * Gets a user profile from Firestore
 * @param {string} uid - The user ID
 * @returns {Promise<Object|null>} - The user profile or null if not found
 */
export const getUserProfile = async (uid) => {
  if (!uid) return null;

  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Updates only the username for a user profile
 * @param {string} uid - The user ID
 * @param {string} newUsername - The new username
 * @returns {Promise<void>}
 */
export const updateUserUsername = async (uid, newUsername) => {
  if (!uid || !newUsername) return;

  try {
    console.log('Updating username for user:', uid, 'to:', newUsername);

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      username: newUsername.trim(),
      lastActive: new Date()
    }, { merge: true });

    console.log('Username updated successfully');
  } catch (error) {
    console.error('Error updating username:', error);
    throw error;
  }
};
