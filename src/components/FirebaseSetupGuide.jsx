import { FaExclamationTriangle, FaFireAlt, FaCode } from 'react-icons/fa';

const FirebaseSetupGuide = () => {
  return (
    <div className="firebase-setup-guide">
      <div className="guide-container">
        <div className="guide-header">
          <FaExclamationTriangle className="warning-icon" />
          <h2>Firebase Configuration Required</h2>
        </div>

        <div className="guide-content">
          <p>
            To use this chat application, you need to set up your own Firebase project and update the configuration.
          </p>

          <h3><FaFireAlt /> Firebase Setup Steps:</h3>
          <ol>
            <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
            <li>Create a new project (or use an existing one)</li>
            <li>Add a web app to your project</li>
            <li>Enable Authentication (Email/Password) in the Firebase console</li>
            <li>Enable Firestore Database in the Firebase console</li>
            <li>Copy your Firebase configuration</li>
          </ol>

          <h3><FaCode /> Update Configuration:</h3>
          <p>Create a <code>.env</code> file in the root directory and add your Firebase configuration:</p>

          <pre className="code-block">
{`# Firebase Configuration
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID`}
          </pre>

          <p>You can copy the <code>.env.example</code> file and rename it to <code>.env</code>, then replace the placeholder values with your actual Firebase configuration.</p>

          <div className="note">
            <p><strong>Note:</strong> The <code>.env</code> file is excluded from version control to keep your Firebase credentials secure.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseSetupGuide;
