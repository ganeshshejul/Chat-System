import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaComments, FaSun, FaMoon } from 'react-icons/fa';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <FaComments className="logo-icon" />
        <Link to="/" className="logo-text">Chat System</Link>
      </div>
      <div className="navbar-user">
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>
        {currentUser ? (
          <>
            <span className="user-name">Hello, {currentUser.displayName}</span>
            <button onClick={handleLogout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
          </>
        ) : (
          <div className="auth-links">
            <Link to="/login" className="auth-link">Login</Link>
            <Link to="/signup" className="auth-link">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
