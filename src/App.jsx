import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { UserProvider } from './context/UserContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Chat from './pages/Chat.jsx';
import './styles/App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <UserProvider>
          <div className="app">
            <Navbar />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={
                <PrivateRoute>
                  <Chat />
                </PrivateRoute>
              } />
            </Routes>
          </div>
        </UserProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
