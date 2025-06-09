import { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  doc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  deleteDoc,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { useAuth } from './AuthContext.jsx';

const UserContext = createContext();

export const useUser = () => {
  return useContext(UserContext);
};

export const UserProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});

  // Load user contacts when currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setContacts([]);
      return;
    }

    const contactsRef = collection(db, 'users', currentUser.uid, 'contacts');
    const unsubscribe = onSnapshot(contactsRef, (snapshot) => {
      const contactsData = [];

      // Create an array of promises to get user data for each contact
      const promises = snapshot.docs.map(async (doc) => {
        const contactData = doc.data();
        const userDoc = await getDoc(contactData.userRef);

        if (userDoc.exists()) {
          contactsData.push({
            id: doc.id,
            uid: userDoc.id,
            ...userDoc.data()
          });
        }
      });

      // Wait for all promises to resolve
      Promise.all(promises)
        .then(() => {
          setContacts(contactsData);
        })
        .catch((error) => {
          console.error('Error loading contacts:', error);
          setError('Failed to load contacts');
        });
    });

    return unsubscribe;
  }, [currentUser]);

  // Load private messages when activeChat changes
  useEffect(() => {
    if (!currentUser || !activeChat) {
      setPrivateMessages([]);
      return;
    }

    // Create a chat ID that is the same regardless of who initiated the chat
    const chatId = [currentUser.uid, activeChat.uid].sort().join('_');

    const messagesRef = collection(db, 'privateMessages', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPrivateMessages(messagesData);

      // Clear unread messages for this contact when viewing their chat
      setUnreadMessages(prev => ({
        ...prev,
        [activeChat.uid]: 0
      }));
    }, (error) => {
      console.error('Error loading private messages:', error);
      setError('Failed to load messages');
    });

    return unsubscribe;
  }, [currentUser, activeChat]);

  // Listen for new messages from all contacts to track unread messages
  useEffect(() => {
    if (!currentUser || !contacts.length) return;

    console.log("Setting up message listeners for contacts:", contacts.length);

    // Create listeners for each contact
    const unsubscribes = contacts.map(contact => {
      // Create a chat ID that is the same regardless of who initiated the chat
      const chatId = [currentUser.uid, contact.uid].sort().join('_');

      const messagesRef = collection(db, 'privateMessages', chatId, 'messages');
      // Query all messages, ordered by creation time
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

      return onSnapshot(q, (snapshot) => {
        // Skip if there are no messages
        if (snapshot.empty) {
          return;
        }

        const latestMessage = snapshot.docs[0].data();

        // If the latest message is from the contact and not the current user
        // and the contact is not the active chat, mark as unread
        if (latestMessage.senderId === contact.uid &&
            (!activeChat || activeChat.uid !== contact.uid)) {

          console.log(`New message from ${contact.displayName}: "${latestMessage.text.substring(0, 20)}..."`);

          // Set unread flag for this contact
          setUnreadMessages(prev => ({
            ...prev,
            [contact.uid]: (prev[contact.uid] || 0) + 1
          }));
        }
      });
    });

    // Clean up listeners
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [currentUser, contacts, activeChat]);

  // Clear unread messages when changing active chat
  useEffect(() => {
    if (activeChat && currentUser) {
      console.log(`Clearing unread messages for ${activeChat.displayName}`);

      // Clear unread messages for this contact
      setUnreadMessages(prev => {
        if (prev[activeChat.uid]) {
          const newState = {
            ...prev,
            [activeChat.uid]: 0
          };
          console.log("Clearing unread messages for active chat:", newState);
          return newState;
        }
        return prev;
      });
    }
  }, [activeChat, currentUser]);

  // Search for users by display name or email - simplified and more robust
  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim() || !currentUser) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Searching for users with term:', searchTerm);

      // Get ALL users from Firestore - no filtering at query level
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      console.log('Total users in database:', snapshot.size);

      if (snapshot.empty) {
        console.log('No users found in database');
        setError('No users found in the database. Try creating some test users first.');
        setSearchResults([]);
        return;
      }

      // Log all users for debugging
      snapshot.docs.forEach(doc => {
        console.log('User in database:', doc.id, doc.data());
      });

      // Filter users client-side
      const searchTermLower = searchTerm.toLowerCase();
      const filteredUsers = [];

      snapshot.docs.forEach(doc => {
        // Skip current user
        if (doc.id === currentUser.uid) {
          console.log('Skipping current user:', doc.id);
          return;
        }

        const userData = doc.data();

        // Extract user data with fallbacks
        const displayName = userData.displayName || '';
        const email = userData.email || '';
        const username = userData.username || '';

        console.log(`Checking user ${doc.id}: displayName="${displayName}", email="${email}", username="${username}"`);

        // Simple string includes check for all searchable fields
        const nameMatch = displayName.toLowerCase().includes(searchTermLower);
        const emailMatch = email.toLowerCase().includes(searchTermLower);
        const usernameMatch = username.toLowerCase().includes(searchTermLower);

        if (nameMatch || emailMatch || usernameMatch) {
          console.log(`User ${doc.id} matches search criteria`);

          filteredUsers.push({
            id: doc.id,
            ...userData,
            // Ensure these fields exist for display
            displayName: displayName || 'User',
            email: email || 'No Email'
          });
        }
      });

      console.log('Filtered users:', filteredUsers);
      setSearchResults(filteredUsers);

      if (filteredUsers.length === 0) {
        console.log('No users matched the search criteria');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add a user to contacts
  const addContact = async (user) => {
    if (!currentUser) return;

    try {
      // Add to current user's contacts
      const contactRef = doc(collection(db, 'users', currentUser.uid, 'contacts'));
      await setDoc(contactRef, {
        userRef: doc(db, 'users', user.id),
        addedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error adding contact:', error);
      setError('Failed to add contact');
      return false;
    }
  };

  // Remove a contact
  const removeContact = async (contactId) => {
    if (!currentUser) return;

    try {
      // Find the contact document
      const contactsRef = collection(db, 'users', currentUser.uid, 'contacts');
      const q = query(contactsRef, where('userRef', '==', doc(db, 'users', contactId)));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Delete the contact document
        await deleteDoc(snapshot.docs[0].ref);
      }

      return true;
    } catch (error) {
      console.error('Error removing contact:', error);
      setError('Failed to remove contact');
      return false;
    }
  };

  // Send a private message
  const sendPrivateMessage = async (text, recipientId) => {
    if (!currentUser || !text.trim()) return;

    try {
      // Create a chat ID that is the same regardless of who initiated the chat
      const chatId = [currentUser.uid, recipientId].sort().join('_');

      // Create message data
      const messageData = {
        text,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        recipientId,
        createdAt: serverTimestamp()
      };

      console.log(`Sending message to ${recipientId}: ${text}`);

      // Add message to the private messages collection
      await addDoc(collection(db, 'privateMessages', chatId, 'messages'), messageData);

      return true;
    } catch (error) {
      console.error('Error sending private message:', error);
      setError('Failed to send message');
      return false;
    }
  };

  // Clear chat history with a specific user
  const clearChat = async (recipientId) => {
    if (!currentUser) return false;

    try {
      // Create a chat ID that is the same regardless of who initiated the chat
      const chatId = [currentUser.uid, recipientId].sort().join('_');

      // Get all messages in the chat
      const messagesRef = collection(db, 'privateMessages', chatId, 'messages');
      const snapshot = await getDocs(messagesRef);

      // Delete each message
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      console.log(`Cleared ${snapshot.docs.length} messages from chat with user ${recipientId}`);
      return true;
    } catch (error) {
      console.error('Error clearing chat:', error);
      setError('Failed to clear chat history');
      return false;
    }
  };

  // Clear public chat messages
  const clearPublicChat = async () => {
    if (!currentUser) return false;

    try {
      // Check if user is an admin (optional - you can implement admin check if needed)
      // For now, any user can clear the public chat

      // Get all messages in the public chat
      const messagesRef = collection(db, 'messages');
      const snapshot = await getDocs(messagesRef);

      // Delete each message
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      console.log(`Cleared ${snapshot.docs.length} messages from public chat`);
      return true;
    } catch (error) {
      console.error('Error clearing public chat:', error);
      setError('Failed to clear public chat');
      return false;
    }
  };

  // For testing: manually set unread messages
  const setContactUnread = (contactId, count = 1) => {
    if (!contactId) return;

    console.log(`Manually setting unread count for contact ${contactId} to ${count}`);
    setUnreadMessages(prev => ({
      ...prev,
      [contactId]: count
    }));
  };

  const value = {
    contacts,
    searchResults,
    loading,
    error,
    activeChat,
    privateMessages,
    unreadMessages,
    searchUsers,
    addContact,
    removeContact,
    sendPrivateMessage,
    setActiveChat,
    clearChat,
    clearPublicChat,
    setContactUnread // For testing
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
