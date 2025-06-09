import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { checkUsernameAvailability, validateUsername, getUsernameSuggestions } from '../utils/usernameUtils.js';
import { FaEnvelope, FaLock, FaUser, FaUserPlus, FaEye, FaEyeSlash, FaCheckCircle, FaPaperPlane, FaGoogle, FaCheck, FaTimes, FaAt } from 'react-icons/fa';

const Signup = () => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(''); // 'checking', 'available', 'taken', 'invalid'
  const [usernameMessage, setUsernameMessage] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const { signup, resendEmailVerification, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Username validation and checking
  const checkUsername = async (usernameToCheck) => {
    if (!usernameToCheck) {
      setUsernameStatus('');
      setUsernameMessage('');
      setUsernameSuggestions([]);
      return;
    }

    const validation = validateUsername(usernameToCheck);
    if (!validation.isValid) {
      setUsernameStatus('invalid');
      setUsernameMessage(validation.message);
      setUsernameSuggestions([]);
      return;
    }

    setCheckingUsername(true);
    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    try {
      console.log('Checking username availability for:', usernameToCheck);
      const isAvailable = await checkUsernameAvailability(usernameToCheck);
      console.log('Username availability result:', isAvailable);

      if (isAvailable) {
        setUsernameStatus('available');
        setUsernameMessage('Username is available!');
        setUsernameSuggestions([]);
      } else {
        setUsernameStatus('taken');
        setUsernameMessage('Username is already taken');
        // Get suggestions
        try {
          const suggestions = await getUsernameSuggestions(displayName || usernameToCheck);
          setUsernameSuggestions(suggestions);
        } catch (suggestionError) {
          console.warn('Failed to get username suggestions:', suggestionError);
          setUsernameSuggestions([]);
        }
      }
    } catch (error) {
      console.error('Error checking username:', error);

      // If it's a database/permission error, assume username is available
      if (error.message.includes('Database not available') ||
          error.message.includes('permission-denied') ||
          error.message.includes('index')) {
        console.warn('Database issue, assuming username is available');
        setUsernameStatus('available');
        setUsernameMessage('Username appears to be available (database check limited)');
        setUsernameSuggestions([]);
      } else {
        setUsernameStatus('error');
        setUsernameMessage('Unable to check username availability. Please try again.');
        setUsernameSuggestions([]);
      }
    } finally {
      setCheckingUsername(false);
    }
  };

  // Debounced username checking
  useEffect(() => {
    if (!username) return;

    const timeoutId = setTimeout(() => {
      checkUsername(username);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, displayName]);

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(value);
  };

  const selectSuggestion = (suggestion) => {
    setUsername(suggestion);
    setUsernameSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (!username) {
      return setError('Username is required');
    }

    if (usernameStatus !== 'available') {
      if (usernameStatus === 'error') {
        // Allow submission if there was a database error (username checking failed)
        console.warn('Proceeding with signup despite username check error');
      } else {
        return setError('Please choose a valid and available username');
      }
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password, displayName, username);
      setVerificationSent(true);
      // Don't navigate immediately - show verification message instead
    } catch (error) {
      console.error('Signup error:', error);

      // Provide more specific error messages
      if (error.code === 'auth/invalid-email') {
        setError('Invalid email address format');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('Email is already in use');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. It should be at least 6 characters');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection or Firebase configuration');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Email/password accounts are not enabled in Firebase console');
      } else {
        setError(`Failed to create an account: ${error.message || 'Firebase configuration may be incorrect'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      setError('');
      await resendEmailVerification();
      // Show success message or update UI to indicate email was resent
    } catch (error) {
      console.error('Resend verification error:', error);
      if (error.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait before requesting another verification email.');
      } else {
        setError('Failed to resend verification email. Please try again.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoogleSignUp = async () => {
    try {
      setError('');
      setGoogleLoading(true);

      const userCredential = await signInWithGoogle();
      console.log('Google sign-up successful:', userCredential.user.email);

      // Google accounts are automatically verified, so we can navigate directly
      navigate('/');
    } catch (error) {
      console.error('Google sign-up error:', error);

      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-up was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email. Please try logging in instead.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError('Failed to sign up with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Show verification message if email was sent
  if (verificationSent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">
            <FaCheckCircle className="auth-icon" style={{ color: 'var(--success-color)' }} />
            Verify Your Email
          </h2>

          <div className="verification-message">
            <p>
              <strong>Account created successfully!</strong>
            </p>
            <p>
              We've sent a verification email to <strong>{email}</strong>.
              Please check your inbox and click the verification link to activate your account.
            </p>
            <p className="verification-note">
              Don't forget to check your spam folder if you don't see the email.
            </p>
          </div>

          <div className="verification-actions">
            <button
              onClick={handleResendVerification}
              className="resend-button"
              disabled={resendLoading}
            >
              <FaPaperPlane /> {resendLoading ? 'Sending...' : 'Resend Verification Email'}
            </button>

            <button
              onClick={handleGoToLogin}
              className="auth-button"
            >
              Go to Login
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">
          <FaUserPlus className="auth-icon" /> Sign Up
        </h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="displayName">
              <FaUser /> Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">
              <FaAt /> Username
            </label>
            <div className="username-input-container">
              <input
                type="text"
                id="username"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Choose a unique username"
                required
              />
              {checkingUsername && (
                <div className="username-status checking">
                  <div className="spinner"></div>
                </div>
              )}
              {!checkingUsername && usernameStatus === 'available' && (
                <div className="username-status available">
                  <FaCheck />
                </div>
              )}
              {!checkingUsername && (usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                <div className="username-status unavailable">
                  <FaTimes />
                </div>
              )}
            </div>
            {usernameMessage && (
              <div className={`username-message ${usernameStatus}`}>
                {usernameMessage}
              </div>
            )}
            {usernameSuggestions.length > 0 && (
              <div className="username-suggestions">
                <p>Try these available usernames:</p>
                <div className="suggestions-list">
                  {usernameSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="suggestion-btn"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope /> Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <FaLock /> Password
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <FaLock /> Confirm Password
            </label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading || googleLoading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="google-auth-button"
          onClick={handleGoogleSignUp}
          disabled={loading || googleLoading}
        >
          <FaGoogle className="google-icon" />
          {googleLoading ? 'Signing up...' : 'Continue with Google'}
        </button>

        <div className="auth-redirect">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
