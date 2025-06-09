import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { findUserByIdentifier } from '../utils/usernameUtils.js';
import { FaEnvelope, FaLock, FaSignInAlt, FaEye, FaEyeSlash, FaExclamationTriangle, FaPaperPlane, FaKey, FaTimes, FaGoogle, FaAt } from 'react-icons/fa';

const Login = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, resendEmailVerification, resetPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setShowVerificationWarning(false);
      setLoading(true);

      // Check if input is username or email
      let emailToLogin = emailOrUsername;

      // If it doesn't contain @, it might be a username
      if (!emailOrUsername.includes('@')) {
        console.log('🔍 Attempting username login for:', emailOrUsername);

        // BYPASS USERNAME LOOKUP FOR NOW - DIRECT EMAIL LOGIN ONLY
        setError('Username login is temporarily disabled. Please use your email address to log in.');
        return;

        /* COMMENTED OUT UNTIL FIRESTORE RULES ARE FIXED
        try {
          const userData = await findUserByIdentifier(emailOrUsername);
          console.log('🔍 Username lookup result:', userData);

          if (userData && userData.email) {
            emailToLogin = userData.email;
            console.log('✅ Found email for username:', emailToLogin);
          } else {
            console.log('❌ No user found for username:', emailOrUsername);
            throw new Error('User not found');
          }
        } catch (error) {
          console.error('❌ Error finding user by username:', error);

          // Check for permission errors and provide helpful guidance
          if (error.message.includes('Database access denied') ||
              error.message.includes('Missing or insufficient permissions')) {
            setError('Database access error. Please contact the administrator to configure Firestore security rules.');
          } else {
            setError('User not found. Please check your username or email.');
          }
          return;
        }
        */
      } else {
        console.log('📧 Using email directly for login:', emailOrUsername);
      }

      const userCredential = await login(emailToLogin, password);

      // Check if email is verified (skip for Google users as they are automatically verified)
      const isGoogleUser = userCredential.user.providerData.some(provider => provider.providerId === 'google.com');
      if (!userCredential.user.emailVerified && !isGoogleUser) {
        setShowVerificationWarning(true);
        setError('Please verify your email address before logging in. Check your inbox for a verification email.');
        return;
      }

      navigate('/');
    } catch (error) {
      console.error('Login error:', error);

      // Provide more specific error messages
      // Handle authentication failures with a user-friendly message
      if (error.code === 'auth/invalid-credential' ||
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password') {
        setError('Enter The Correct Email ID And Password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address format');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection or Firebase configuration');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later');
      } else {
        setError(`Failed to log in: ${error.message || 'Firebase configuration may be incorrect'}`);
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
      setError('Verification email sent! Please check your inbox.');
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!forgotPasswordEmail) {
      setForgotPasswordMessage('Please enter your email address');
      return;
    }

    try {
      setForgotPasswordLoading(true);
      setForgotPasswordMessage('');
      await resetPassword(forgotPasswordEmail);
      setForgotPasswordMessage('Password reset email sent! Please check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.code === 'auth/user-not-found') {
        setForgotPasswordMessage('No account found with this email address');
      } else if (error.code === 'auth/invalid-email') {
        setForgotPasswordMessage('Invalid email address format');
      } else if (error.code === 'auth/too-many-requests') {
        setForgotPasswordMessage('Too many requests. Please wait before requesting another reset email.');
      } else {
        setForgotPasswordMessage('Failed to send password reset email. Please try again.');
      }
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const openForgotPassword = () => {
    setShowForgotPassword(true);
    // Pre-fill with current input if it looks like an email
    const prefillEmail = emailOrUsername.includes('@') ? emailOrUsername : '';
    setForgotPasswordEmail(prefillEmail);
    setForgotPasswordMessage('');
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordMessage('');
  };













  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setShowVerificationWarning(false);
      setGoogleLoading(true);

      const userCredential = await signInWithGoogle();
      console.log('Google sign-in successful:', userCredential.user.email);

      // Google accounts are automatically verified, so we can navigate directly
      navigate('/');
    } catch (error) {
      console.error('Google sign-in error:', error);

      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">
          <FaSignInAlt className="auth-icon" /> Login
        </h2>

        {error && <div className="auth-error">{error}</div>}

        {showVerificationWarning && (
          <div className="verification-warning">
            <div className="warning-content">
              <FaExclamationTriangle className="warning-icon" />
              <div>
                <p><strong>Email verification required</strong></p>
                <p>Please verify your email address to continue.</p>
              </div>
            </div>
            <button
              onClick={handleResendVerification}
              className="resend-button small"
              disabled={resendLoading}
            >
              <FaPaperPlane /> {resendLoading ? 'Sending...' : 'Resend Email'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="emailOrUsername">
              <FaAt /> Email Address
            </label>
            <input
              type="email"
              id="emailOrUsername"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="Enter your email address (username login temporarily disabled)"
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

          <button type="submit" className="auth-button" disabled={loading || googleLoading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="google-auth-button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
        >
          <FaGoogle className="google-icon" />
          {googleLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div className="forgot-password-link">
          <button
            type="button"
            className="link-button"
            onClick={openForgotPassword}
          >
            <FaKey /> Forgot Password?
          </button>
        </div>

        <div className="auth-redirect">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={closeForgotPassword}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FaKey /> Reset Password
              </h3>
              <button
                className="modal-close-btn"
                onClick={closeForgotPassword}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <p>Enter your email address and we'll send you a link to reset your password.</p>

              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label htmlFor="forgotPasswordEmail">
                    <FaEnvelope /> Email Address
                  </label>
                  <input
                    type="email"
                    id="forgotPasswordEmail"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    placeholder="Enter your email address"
                  />
                </div>

                {forgotPasswordMessage && (
                  <div className={`auth-message ${forgotPasswordMessage.includes('sent') ? 'success' : 'error'}`}>
                    {forgotPasswordMessage}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="submit"
                    className="auth-button"
                    disabled={forgotPasswordLoading}
                  >
                    {forgotPasswordLoading ? 'Sending...' : 'Send Reset Email'}
                  </button>
                  <button
                    type="button"
                    className="auth-button secondary"
                    onClick={closeForgotPassword}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
