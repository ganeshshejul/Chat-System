import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext.jsx';
import { FaSearch, FaUserPlus, FaCheck, FaExclamationTriangle, FaBug, FaUser, FaTrash, FaUserTimes, FaComments, FaEdit, FaTimes, FaEye, FaEyeSlash, FaAt } from 'react-icons/fa';
import { doc, setDoc, collection, getDocs, deleteDoc, query, where, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { checkUsernameAvailability, validateUsername } from '../utils/usernameUtils.js';
import { db } from '../firebase/config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

const UserSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { searchUsers, searchResults, loading, error, addContact, contacts, setActiveChat } = useUser();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [addingContact, setAddingContact] = useState({});
  const [searchPerformed, setSearchPerformed] = useState(false);

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    displayName: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [editProfileError, setEditProfileError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [originalUsername, setOriginalUsername] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    searchUsers(searchTerm);
    setSearchPerformed(true);

    // Log for debugging
    console.log('Search initiated for term:', searchTerm);
  };

  const handleAddContact = async (user) => {
    setAddingContact(prev => ({ ...prev, [user.id]: true }));
    await addContact(user);
    setAddingContact(prev => ({ ...prev, [user.id]: false }));
  };

  // Check if a user is already in contacts
  const isContact = (userId) => {
    return contacts.some(contact => contact.uid === userId);
  };

  // Log search results for debugging
  useEffect(() => {
    if (searchPerformed) {
      console.log('Search results updated:', searchResults);
    }
  }, [searchResults, searchPerformed]);





  // Debug function to create test users (only for development)
  const createTestUsers = async () => {
    try {
      console.log('Creating test users...');

      // Create a few test users
      const testUsers = [
        {
          id: 'test-user-1',
          displayName: 'Test User 1',
          displayNameLower: 'test user 1',
          email: 'testuser1@example.com',
          createdAt: new Date(),
          lastActive: new Date()
        },
        {
          id: 'test-user-2',
          displayName: 'Test User 2',
          displayNameLower: 'test user 2',
          email: 'testuser2@example.com',
          createdAt: new Date(),
          lastActive: new Date()
        },
        {
          id: 'test-user-3',
          displayName: 'John Doe',
          displayNameLower: 'john doe',
          email: 'johndoe@example.com',
          createdAt: new Date(),
          lastActive: new Date()
        }
      ];

      // Save test users to Firestore
      for (const user of testUsers) {
        await setDoc(doc(db, 'users', user.id), user);
        console.log('Created test user:', user.displayName);
      }

      console.log('Test users created successfully');
      alert('Test users created successfully. Try searching for "test" or "john".');
    } catch (error) {
      console.error('Error creating test users:', error);
      alert('Error creating test users: ' + error.message);
    }
  };

  // Function to delete test users
  const deleteTestUsers = async () => {
    try {
      console.log('Deleting test users...');

      // List of test user IDs to delete
      const testUserIds = ['test-user-1', 'test-user-2', 'test-user-3'];

      // Delete each test user
      for (const userId of testUserIds) {
        await deleteDoc(doc(db, 'users', userId));
        console.log('Deleted test user:', userId);
      }

      console.log('Test users deleted successfully');
      alert('Test users deleted successfully.');
    } catch (error) {
      console.error('Error deleting test users:', error);
      alert('Error deleting test users: ' + error.message);
    }
  };

  // Function to delete a specific user
  const deleteUser = async (userId) => {
    if (!confirm(`Are you sure you want to delete user with ID: ${userId}?`)) {
      return;
    }

    try {
      console.log('Deleting user:', userId);

      // Delete the user from Firestore
      await deleteDoc(doc(db, 'users', userId));

      console.log('User deleted successfully');
      alert('User deleted successfully.');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + error.message);
    }
  };

  // Function to go to public chat
  const goToPublicChat = () => {
    // Set activeChat to null to show the public chat
    setActiveChat(null);

    // If on mobile, close the sidebar
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle && window.innerWidth < 768) {
      sidebarToggle.click();
    }
  };

  // Function to delete the current user's profile
  const deleteMyProfile = async () => {
    if (!currentUser) {
      alert('You must be logged in to delete your profile');
      return;
    }

    setIsDeleting(true);

    try {
      console.log('Deleting profile for current user:', currentUser.uid);

      // 1. Delete user's own contacts subcollection (user has permission for their own data)
      try {
        const contactsRef = collection(db, 'users', currentUser.uid, 'contacts');
        const contactsSnapshot = await getDocs(contactsRef);

        const contactDeletePromises = contactsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(contactDeletePromises);
        console.log('Deleted user contacts:', contactsSnapshot.size);
      } catch (contactError) {
        console.warn('Could not delete contacts:', contactError.message);
        // Continue with deletion even if contacts can't be deleted
      }

      // 2. Delete user profile from Firestore (user has permission for their own document)
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid));
        console.log('Deleted user profile from Firestore');
      } catch (profileError) {
        console.error('Failed to delete user profile from Firestore:', profileError);
        throw new Error('Failed to delete user profile from database');
      }

      // 3. Delete the Firebase Auth user (this will also trigger cleanup)
      try {
        await currentUser.delete();
        console.log('Deleted Firebase Auth user');
      } catch (authError) {
        console.error('Failed to delete Firebase Auth user:', authError);

        if (authError.code === 'auth/requires-recent-login') {
          throw new Error('For security reasons, you need to log in again before deleting your account. Please log out and log back in, then try again.');
        } else {
          throw new Error('Failed to delete user account: ' + authError.message);
        }
      }

      // 4. Reset state and navigate to login
      setShowDeleteConfirmation(false);
      setIsDeleting(false);

      alert('Your profile has been successfully deleted. Note: Some related data (like messages in other users\' chats) may remain for privacy reasons. You will be redirected to the login page.');
      navigate('/login');

    } catch (error) {
      console.error('Error deleting user profile:', error);
      setIsDeleting(false);

      if (error.message.includes('log in again')) {
        alert(error.message);
      } else if (error.code === 'permission-denied') {
        alert('Permission denied. Please make sure you are logged in and try again.');
      } else {
        alert('Error deleting profile: ' + error.message);
      }
    }
  };

  // Function to open edit profile modal
  const openEditProfile = async () => {
    try {
      // Get current user's profile data including username
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const currentUsername = userData.username || '';
      console.log('Loading edit profile - userData:', userData);
      console.log('Current username from Firestore:', currentUsername);
      setOriginalUsername(currentUsername);

      setEditProfileData({
        displayName: currentUser?.displayName || '',
        username: currentUsername,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setEditProfileError('');
      setUsernameStatus('');
      setUsernameMessage('');
      setShowEditProfile(true);
    } catch (error) {
      console.error('Error loading profile data:', error);
      setEditProfileError('Failed to load profile data');
    }
  };

  // Function to close edit profile modal
  const closeEditProfile = () => {
    setShowEditProfile(false);
    setEditProfileData({
      displayName: '',
      username: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setEditProfileError('');
    setUsernameStatus('');
    setUsernameMessage('');
    setOriginalUsername('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // Check username availability for edit profile
  const checkUsernameForEdit = async (usernameToCheck) => {
    if (!usernameToCheck || usernameToCheck === originalUsername) {
      setUsernameStatus('');
      setUsernameMessage('');
      return;
    }

    const validation = validateUsername(usernameToCheck);
    if (!validation.isValid) {
      setUsernameStatus('invalid');
      setUsernameMessage(validation.message);
      return;
    }

    setCheckingUsername(true);
    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    try {
      const isAvailable = await checkUsernameAvailability(usernameToCheck);
      if (isAvailable) {
        setUsernameStatus('available');
        setUsernameMessage('Username is available!');
      } else {
        setUsernameStatus('taken');
        setUsernameMessage('Username is already taken');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameStatus('invalid');
      setUsernameMessage('Error checking username availability');
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChangeInEdit = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setEditProfileData(prev => ({ ...prev, username: value }));

    // Debounce username checking
    setTimeout(() => {
      checkUsernameForEdit(value);
    }, 500);
  };

  // Function to handle edit profile form submission
  const handleEditProfile = async (e) => {
    e.preventDefault();
    setEditProfileLoading(true);
    setEditProfileError('');

    try {
      const { displayName, username, currentPassword, newPassword, confirmPassword } = editProfileData;

      // Validate inputs
      if (!displayName.trim()) {
        throw new Error('Display name is required');
      }

      if (!username.trim()) {
        throw new Error('Username is required');
      }

      // Check username if it's different from original
      if (username !== originalUsername) {
        if (usernameStatus !== 'available') {
          throw new Error('Please choose a valid and available username');
        }
      }

      // If user wants to change password
      if (newPassword || confirmPassword || currentPassword) {
        if (!currentPassword) {
          throw new Error('Current password is required to change password');
        }
        if (!newPassword) {
          throw new Error('New password is required');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match');
        }
        if (newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters long');
        }

        // Reauthenticate user before changing password
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);

        // Update password
        await updatePassword(currentUser, newPassword);
        console.log('Password updated successfully');
      }

      // Update display name in Firebase Auth
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: displayName.trim() });
        console.log('Display name updated in Firebase Auth');
      }

      // Update profile data in Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const updates = {
        lastActive: new Date()
      };

      if (displayName !== currentUser.displayName) {
        updates.displayName = displayName.trim();
        updates.displayNameLower = displayName.trim().toLowerCase();
      }

      if (username !== originalUsername) {
        updates.username = username.trim();
      }

      if (Object.keys(updates).length > 1) { // More than just lastActive
        await updateDoc(userDocRef, updates);
        console.log('Profile updated in Firestore');
      }

      // Close modal and show success
      closeEditProfile();
      alert('Profile updated successfully!');

      // Refresh the page to reflect changes
      window.location.reload();

    } catch (error) {
      console.error('Error updating profile:', error);

      if (error.code === 'auth/wrong-password') {
        setEditProfileError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setEditProfileError('New password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        setEditProfileError('Please log out and log back in before changing your password');
      } else {
        setEditProfileError(error.message || 'Failed to update profile');
      }
    } finally {
      setEditProfileLoading(false);
    }
  };

  return (
    <div className="user-search">
      <h3 className="user-search-title">Find Users</h3>
      <form onSubmit={handleSearch} className="user-search-form">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, username, or email"
          className="user-search-input"
        />
        <button type="submit" className="user-search-button" disabled={loading}>
          <FaSearch />
        </button>
      </form>

      {loading && <div className="user-search-loading">Searching...</div>}

      {error && (
        <div className="user-search-error">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {searchResults.length > 0 ? (
        <ul className="user-search-results">
          {searchResults.map(user => (
            <li key={user.id} className="user-search-item">
              <div className="user-search-info">
                <div className="user-search-name">{user.displayName}</div>
                {user.username && (
                  <div className="user-search-username">@{user.username}</div>
                )}
                <div className="user-search-email">{user.email}</div>
              </div>
              {isContact(user.id) ? (
                <button className="user-search-added" disabled>
                  <FaCheck /> Added
                </button>
              ) : (
                <button
                  className="user-search-add"
                  onClick={() => handleAddContact(user)}
                  disabled={addingContact[user.id]}
                >
                  {addingContact[user.id] ? 'Adding...' : (
                    <>
                      <FaUserPlus /> Add
                    </>
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : searchPerformed && !loading ? (
        <div className="user-search-no-results">
          No users found matching "{searchTerm}"
          <p className="user-search-hint">Try a different search term or check if other users have registered.</p>
        </div>
      ) : null}

      {!searchPerformed && !loading && (
        <div className="user-search-instructions">
          <p>Search for users by name, username, or email to add them to your contacts.</p>
          <p>You can then start private conversations with your contacts.</p>

          <div className="debug-buttons">
            <button
              className="debug-button success"
              onClick={openEditProfile}
              title="Edit your profile name and change password"
              aria-label="Edit my profile"
            >
              <FaEdit />
              <span>Edit<br />My<br />Profile</span>
            </button>

            <button
              className="debug-button danger"
              onClick={() => setShowDeleteConfirmation(true)}
              title="Delete your user profile"
              aria-label="Delete my profile"
            >
              <FaUserTimes />
              <span>Delete<br />My<br />Profile</span>
            </button>

            <button
              className="debug-button info"
              onClick={goToPublicChat}
              title="Go to public chat"
              aria-label="Go to public chat"
            >
              <FaComments />
              <span>Public<br />Chat</span>
            </button>
          </div>
        </div>
      )}



      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="modal-overlay" onClick={closeEditProfile}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FaEdit /> Edit Profile
              </h3>
              <button
                className="modal-close-btn"
                onClick={closeEditProfile}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleEditProfile}>
                <div className="form-group">
                  <label htmlFor="editDisplayName">
                    <FaUser /> Display Name
                  </label>
                  <input
                    type="text"
                    id="editDisplayName"
                    value={editProfileData.displayName}
                    onChange={(e) => setEditProfileData(prev => ({
                      ...prev,
                      displayName: e.target.value
                    }))}
                    required
                    placeholder="Enter your display name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="editUsername">
                    <FaAt /> Username
                  </label>
                  <div className="username-input-container">
                    <input
                      type="text"
                      id="editUsername"
                      value={editProfileData.username}
                      onChange={handleUsernameChangeInEdit}
                      required
                      placeholder="Choose a unique username"
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
                </div>

                <div className="form-section-divider">
                  <span>Change Password (Optional)</span>
                </div>

                <div className="form-group">
                  <label htmlFor="currentPassword">
                    Current Password
                  </label>
                  <div className="password-input-container">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      id="currentPassword"
                      value={editProfileData.currentPassword}
                      onChange={(e) => setEditProfileData(prev => ({
                        ...prev,
                        currentPassword: e.target.value
                      }))}
                      placeholder="Enter current password to change"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">
                    New Password
                  </label>
                  <div className="password-input-container">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      id="newPassword"
                      value={editProfileData.newPassword}
                      onChange={(e) => setEditProfileData(prev => ({
                        ...prev,
                        newPassword: e.target.value
                      }))}
                      placeholder="Enter new password (min 6 characters)"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <div className="password-input-container">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={editProfileData.confirmPassword}
                      onChange={(e) => setEditProfileData(prev => ({
                        ...prev,
                        confirmPassword: e.target.value
                      }))}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {editProfileError && (
                  <div className="auth-message error">
                    {editProfileError}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="submit"
                    className="auth-button"
                    disabled={editProfileLoading}
                  >
                    {editProfileLoading ? 'Updating...' : 'Update Profile'}
                  </button>
                  <button
                    type="button"
                    className="auth-button secondary"
                    onClick={closeEditProfile}
                    disabled={editProfileLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Profile Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="confirmation-dialog-overlay">
          <div className="confirmation-dialog">
            <h3>Delete Your Profile</h3>
            <p>Are you sure you want to delete your profile? This will:</p>
            <ul>
              <li>Delete your user account and profile information</li>
              <li>Remove your contacts list</li>
              <li>Sign you out of the application</li>
              <li>Make your account inaccessible</li>
            </ul>
            <p className="confirmation-note">
              <strong>Note:</strong> Some data like messages in other users' chats may remain for privacy and data integrity reasons.
            </p>
            <p className="confirmation-warning">This action cannot be undone!</p>
            <div className="confirmation-actions">
              <button
                className="cancel-button"
                onClick={() => setShowDeleteConfirmation(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="confirm-button"
                onClick={deleteMyProfile}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete My Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSearch;
