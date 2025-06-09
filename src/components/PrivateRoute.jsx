import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();

  // If no user is logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // If user is logged in but email is not verified, redirect to login
  // Google users are automatically verified, so we allow them through
  if (!currentUser.emailVerified && !currentUser.providerData.some(provider => provider.providerId === 'google.com')) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;
