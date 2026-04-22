// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredFirebaseKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingFirebaseKeys = requiredFirebaseKeys.filter((key) => !import.meta.env[key]);

let firebaseInitializationError = null;
if (missingFirebaseKeys.length > 0) {
  firebaseInitializationError = new Error(
    `Missing Firebase environment variables: ${missingFirebaseKeys.join(', ')}`
  );
  console.error('Firebase initialization skipped:', firebaseInitializationError.message);
}



/*
Firebase configuration is loaded from environment variables.
Make sure you have a .env file in the root directory with the following variables:

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

To get your Firebase configuration:
1. Go to https://console.firebase.google.com/
2. Select your project
3. Click on the gear icon (⚙️) next to "Project Overview" to access project settings
4. Scroll down to "Your apps" section and select your web app
5. Copy the configuration values from the Firebase SDK snippet
*/

// Initialize Firebase safely so configuration issues do not crash app bootstrap.
let app = null;
let auth = null;
let db = null;
let storage = null;

if (!firebaseInitializationError) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    firebaseInitializationError = error;
    console.error('Firebase initialization failed:', error);
  }
}

export { app, auth, db, storage, firebaseInitializationError };

export default app;
