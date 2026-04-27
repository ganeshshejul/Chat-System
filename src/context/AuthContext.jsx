import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth } from '../firebase/config.js';
import { db } from '../firebase/config.js';
import { createOrUpdateUserProfile } from '../utils/userProfile.js';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const lastKnownUserRef = useRef(null);

  const setUserPresence = async (userId, isOnline) => {
    if (!userId) return;
    try {
      const update = { isOnline, lastActive: serverTimestamp() };
      // Only update lastSeen when going offline so it reflects "last time seen"
      if (!isOnline) update.lastSeen = serverTimestamp();
      await setDoc(doc(db, 'users', userId), update, { merge: true });
    } catch (error) {
      console.error('Presence update failed:', error);
    }
  };

  // Check if Firebase is properly configured
  const isFirebaseConfigured = auth &&
    auth.app &&
    auth.app.options &&
    auth.app.options.apiKey &&
    auth.app.options.projectId &&
    auth.app.options.apiKey.startsWith('AIza') &&
    auth.app.options.projectId !== 'your_project_id';

  // Sign up function
  const signup = async (email, password, displayName, username) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not properly configured. Please update your Firebase configuration.');
    }

    try {
      console.log('Signing up user with email:', email, 'displayName:', displayName, 'username:', username);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created successfully:', userCredential.user.uid);

      // Update profile with display name
      await updateProfile(userCredential.user, { displayName });
      console.log('User profile updated with displayName:', displayName);

      // Send email verification
      await sendEmailVerification(userCredential.user);
      console.log('Email verification sent to:', email);

      // Create user profile in Firestore using the Firebase Auth user object
      // The createOrUpdateUserProfile function will handle creating the proper structure
      console.log('Creating user profile in Firestore for user:', userCredential.user.uid, 'with username:', username);
      await createOrUpdateUserProfile(userCredential.user, username);
      console.log('User profile created in Firestore with username:', username);

      // Sign out the user immediately after signup to enforce email verification
      await signOut(auth);
      console.log('User signed out after signup - email verification required');

      return userCredential;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Login function
  const login = async (email, password) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not properly configured. Please update your Firebase configuration.');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Update user profile in Firestore (don't pass username to preserve existing)
      await createOrUpdateUserProfile(userCredential.user);

      return userCredential;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Resend email verification
  const resendEmailVerification = async () => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not properly configured. Please update your Firebase configuration.');
    }

    if (!currentUser) {
      throw new Error('No user is currently signed in.');
    }

    try {
      await sendEmailVerification(currentUser);
      console.log('Email verification resent to:', currentUser.email);
      return true;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  };

  // Check if current user's email is verified
  const checkEmailVerification = async () => {
    if (!currentUser) return false;

    // Reload user to get latest verification status
    await currentUser.reload();
    return currentUser.emailVerified;
  };

  // Reset password function
  const resetPassword = async (email) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not properly configured. Please update your Firebase configuration.');
    }

    try {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent to:', email);
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // Google Sign-In function
  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not properly configured. Please update your Firebase configuration.');
    }

    try {
      const provider = new GoogleAuthProvider();
      // Add additional scopes if needed
      provider.addScope('email');
      provider.addScope('profile');

      console.log('Signing in with Google...');
      const userCredential = await signInWithPopup(auth, provider);
      console.log('Google sign-in successful:', userCredential.user.uid);

      // Create or update user profile in Firestore
      await createOrUpdateUserProfile(userCredential.user);
      console.log('User profile created/updated in Firestore');

      return userCredential;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not properly configured. Please update your Firebase configuration.');
    }

    try {
      if (currentUser?.uid) {
        await setUserPresence(currentUser.uid, false);
      }
      return await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Set up auth state listener
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      setAuthError('Firebase configuration error');
      return;
    }

    // Mark user offline when tab is closed/refreshed (best-effort for Firestore)
    const handlePageHide = () => {
      const uid = lastKnownUserRef.current;
      if (!uid) return;
      setUserPresence(uid, false);
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed - user:', user?.uid, user?.email);

        if (user?.uid) {
          lastKnownUserRef.current = user.uid;
          await setUserPresence(user.uid, true);
        } else if (lastKnownUserRef.current) {
          await setUserPresence(lastKnownUserRef.current, false);
          lastKnownUserRef.current = null;
        }

        // Don't automatically update profile on auth state change
        // Profile updates are handled explicitly in signup/login functions
        // This prevents race conditions and username overwrites

        setCurrentUser(user);
        setLoading(false);
      }, (error) => {
        console.error('Auth state change error:', error);
        setAuthError(error);
        setLoading(false);
      });

      return () => {
        unsubscribe();
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('beforeunload', handlePageHide);
      };
    } catch (error) {
      console.error('Auth setup error:', error);
      setAuthError(error);
      setLoading(false);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      return () => {};
    }
  }, [isFirebaseConfigured]);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resendEmailVerification,
    checkEmailVerification,
    resetPassword,
    signInWithGoogle,
    authError,
    isFirebaseConfigured
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
