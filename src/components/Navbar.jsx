import { useAuth } from '../context/AuthContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaComments } from 'react-icons/fa';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
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
