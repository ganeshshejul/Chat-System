import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  doc,
  addDoc,
  writeBatch,
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
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});
  const permissionRequestedRef = useRef(false);
  const notifiedPrivateMessageIdsRef = useRef(new Set());
  const initializedLatestSnapshotRef = useRef({});

  const canShowNotifications = () => (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  );

  const ensureNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (permissionRequestedRef.current) return;

    permissionRequestedRef.current = true;
    try {
      await Notification.requestPermission();
    } catch (permissionError) {
      console.error('Notification permission request failed:', permissionError);
    }
  };

  const markPendingMessagesAsDelivered = async (userId) => {
    if (!userId) return;

    try {
      const contactsSnapshot = await getDocs(collection(db, 'users', userId, 'contacts'));
      if (contactsSnapshot.empty) return;

      for (const contactDoc of contactsSnapshot.docs) {
        const contactData = contactDoc.data();
        const contactUid = contactData?.userRef?.id;
        if (!contactUid) continue;

        const chatId = [userId, contactUid].sort().join('_');
        const messagesSnapshot = await getDocs(collection(db, 'privateMessages', chatId, 'messages'));
        if (messagesSnapshot.empty) continue;

        const pendingDocs = messagesSnapshot.docs.filter((messageDoc) => {
          const data = messageDoc.data();
          return data.recipientId === userId && data.status === 'sent';
        });

        if (!pendingDocs.length) continue;

        const batch = writeBatch(db);
        pendingDocs.forEach((messageDoc) => {
          batch.update(messageDoc.ref, {
            status: 'delivered',
            deliveredAt: serverTimestamp()
          });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error('Error marking messages as delivered:', error);
    }
  };

  // Load user contacts when currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setContacts([]);
      setReceivedRequests([]);
      setOutgoingRequests([]);
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
    }, (error) => {
      console.error('Contacts listener error:', error);
      setError('Unable to read contacts due to Firestore permissions. Please deploy latest firestore.rules.');
    });

    return unsubscribe;
  }, [currentUser]);

  // Load received friend requests
  useEffect(() => {
    if (!currentUser) {
      setReceivedRequests([]);
      return;
    }

    const requestsRef = collection(db, 'users', currentUser.uid, 'requests');
    const q = query(requestsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requestPromises = snapshot.docs.map(async (requestDoc) => {
        const data = requestDoc.data();
        const senderUid = data.senderId || requestDoc.id;
        const senderDoc = await getDoc(doc(db, 'users', senderUid));

        if (!senderDoc.exists()) return null;

        return {
          id: requestDoc.id,
          senderId: senderUid,
          createdAt: data.createdAt,
          sender: {
            uid: senderDoc.id,
            ...senderDoc.data()
          }
        };
      });

      const requests = (await Promise.all(requestPromises)).filter(Boolean);
      setReceivedRequests(requests);
    }, (listenerError) => {
      console.error('Received requests listener error:', listenerError);
      setError('Unable to read incoming requests due to Firestore permissions.');
    });

    return unsubscribe;
  }, [currentUser]);

  // Load outgoing friend requests
  useEffect(() => {
    if (!currentUser) {
      setOutgoingRequests([]);
      return;
    }

    const outgoingRef = collection(db, 'users', currentUser.uid, 'outgoingRequests');
    const unsubscribe = onSnapshot(outgoingRef, (snapshot) => {
      setOutgoingRequests(snapshot.docs.map((requestDoc) => requestDoc.id));
    }, (listenerError) => {
      console.error('Outgoing requests listener error:', listenerError);
      setError('Unable to read outgoing requests due to Firestore permissions.');
    });

    return unsubscribe;
  }, [currentUser]);

  // Load private messages when activeChat changes
  useEffect(() => {
    if (!currentUser || !activeChat?.uid) {
      setPrivateMessages([]);
      return;
    }

    const activeChatUid = activeChat.uid;

    // Create a chat ID that is the same regardless of who initiated the chat
    const chatId = [currentUser.uid, activeChatUid].sort().join('_');

    const messagesRef = collection(db, 'privateMessages', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPrivateMessages(messagesData);

      // Mark incoming messages as read when the chat is open
      const unreadIncomingDocs = snapshot.docs.filter((messageDoc) => {
        const data = messageDoc.data();
        return (
          data.senderId === activeChatUid &&
          data.recipientId === currentUser.uid &&
          data.status !== 'read'
        );
      });

      if (unreadIncomingDocs.length) {
        const batch = writeBatch(db);
        unreadIncomingDocs.forEach((messageDoc) => {
          const data = messageDoc.data();
          batch.update(messageDoc.ref, {
            status: 'read',
            readAt: serverTimestamp(),
            deliveredAt: data.deliveredAt || serverTimestamp()
          });
        });
        batch.commit().catch((error) => {
          console.error('Error marking messages as read:', error);
        });
      }

      // Clear unread messages for this contact when viewing their chat
      setUnreadMessages(prev => ({
        ...prev,
        [activeChatUid]: 0
      }));
    }, (error) => {
      console.error('Error loading private messages:', error);
      setError('Failed to load messages');
    });

    return unsubscribe;
  }, [currentUser, activeChat?.uid]);

  // Keep active chat user's presence fresh (online / last seen)
  useEffect(() => {
    if (!activeChat?.uid) return;

    const activeChatUserRef = doc(db, 'users', activeChat.uid);
    const unsubscribe = onSnapshot(activeChatUserRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const presenceData = snapshot.data();

      setActiveChat((prev) => {
        if (!prev || prev.uid !== activeChat.uid) return prev;
        return {
          ...prev,
          ...presenceData
        };
      });
    });

    return unsubscribe;
  }, [activeChat?.uid]);

  // When user comes online, mark pending "sent" messages as delivered
  useEffect(() => {
    if (!currentUser?.uid) return;
    markPendingMessagesAsDelivered(currentUser.uid);
  }, [currentUser?.uid]);

  // Ask notification permission once per session
  useEffect(() => {
    if (!currentUser) return;
    ensureNotificationPermission();
  }, [currentUser]);

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
          initializedLatestSnapshotRef.current[chatId] = true;
          return;
        }

        const latestMessageDoc = snapshot.docs[0];
        const latestMessage = latestMessageDoc.data();
        const latestMessageId = latestMessageDoc.id;
        const isInitialSnapshot = !initializedLatestSnapshotRef.current[chatId];
        initializedLatestSnapshotRef.current[chatId] = true;

        const messagePreview = latestMessage.text?.trim() || (latestMessage.image ? 'Sent an image' : 'New message');

        // If the latest message is from the contact and not the current user
        // and the contact is not the active chat, mark as unread
        if (latestMessage.senderId === contact.uid &&
            (!activeChat || activeChat.uid !== contact.uid)) {

          console.log(`New message from ${contact.displayName}: "${messagePreview.slice(0, 20)}..."`);

          // Set unread flag for this contact
          setUnreadMessages(prev => ({
            ...prev,
            [contact.uid]: (prev[contact.uid] || 0) + 1
          }));
        }

        const isIncoming = latestMessage.senderId === contact.uid;
        const shouldNotifyByContext = (
          document.visibilityState === 'hidden' ||
          !document.hasFocus() ||
          !activeChat ||
          activeChat.uid !== contact.uid
        );

        if (
          !isInitialSnapshot &&
          isIncoming &&
          shouldNotifyByContext &&
          canShowNotifications() &&
          !notifiedPrivateMessageIdsRef.current.has(latestMessageId)
        ) {
          notifiedPrivateMessageIdsRef.current.add(latestMessageId);
          const notification = new Notification(contact.displayName || 'New message', {
            body: messagePreview,
            tag: `private-${chatId}`,
            renotify: false
          });

          notification.onclick = () => {
            window.focus();
            setActiveChat(contact);
            notification.close();
          };
        }
      }, (error) => {
        console.error(`Message listener error for contact ${contact.uid}:`, error);
        setError('Unable to read private message status due to Firestore permissions. Please deploy latest firestore.rules.');
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

  // Send a friend request
  const sendContactRequest = async (user) => {
    if (!currentUser || !user?.id || user.id === currentUser.uid) return false;

    try {
      if (contacts.some((contact) => contact.uid === user.id)) {
        return true;
      }

      if (outgoingRequests.includes(user.id)) {
        return true;
      }

      const incomingExisting = receivedRequests.some((request) => request.senderId === user.id);
      if (incomingExisting) {
        setError('This user already sent you a request. Accept it from Requests tab.');
        return false;
      }

      await setDoc(doc(db, 'users', user.id, 'requests', currentUser.uid), {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderEmail: currentUser.email,
        createdAt: serverTimestamp()
      }, { merge: true });

      await setDoc(doc(db, 'users', currentUser.uid, 'outgoingRequests', user.id), {
        recipientId: user.id,
        createdAt: serverTimestamp()
      }, { merge: true });

      return true;
    } catch (error) {
      console.error('Error sending contact request:', error);
      setError('Failed to send request');
      return false;
    }
  };

  const acceptContactRequest = async (senderId) => {
    if (!currentUser || !senderId) return false;

    try {
      const batch = writeBatch(db);

      batch.set(doc(db, 'users', currentUser.uid, 'contacts', senderId), {
        userRef: doc(db, 'users', senderId),
        addedAt: serverTimestamp()
      }, { merge: true });

      batch.set(doc(db, 'users', senderId, 'contacts', currentUser.uid), {
        userRef: doc(db, 'users', currentUser.uid),
        addedAt: serverTimestamp()
      }, { merge: true });

      batch.delete(doc(db, 'users', currentUser.uid, 'requests', senderId));
      batch.delete(doc(db, 'users', senderId, 'outgoingRequests', currentUser.uid));

      await batch.commit();
      return true;
    } catch (acceptError) {
      console.error('Error accepting contact request:', acceptError);
      setError('Failed to accept request');
      return false;
    }
  };

  const declineContactRequest = async (senderId) => {
    if (!currentUser || !senderId) return false;

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', currentUser.uid, 'requests', senderId));
      batch.delete(doc(db, 'users', senderId, 'outgoingRequests', currentUser.uid));
      await batch.commit();
      return true;
    } catch (declineError) {
      console.error('Error declining contact request:', declineError);
      setError('Failed to decline request');
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

      const deterministicContactRef = doc(db, 'users', currentUser.uid, 'contacts', contactId);
      const deterministicDoc = await getDoc(deterministicContactRef);
      if (deterministicDoc.exists()) {
        await deleteDoc(deterministicContactRef);
      } else if (!snapshot.empty) {
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
  const sendPrivateMessage = async (text, recipientId, imageData = null) => {
    if (!currentUser || (!text.trim() && !imageData)) return;

    try {
      const recipientIsContact = contacts.some((contact) => contact.uid === recipientId);
      if (!recipientIsContact) {
        setError('You can only message accepted contacts.');
        return false;
      }

      const chatId = [currentUser.uid, recipientId].sort().join('_');
      const recipientDoc = await getDoc(doc(db, 'users', recipientId));
      const recipientIsOnline = recipientDoc.exists() && recipientDoc.data()?.isOnline;

      const messageData = {
        text: text || '',
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        recipientId,
        createdAt: serverTimestamp(),
        status: recipientIsOnline ? 'delivered' : 'sent',
        deliveredAt: recipientIsOnline ? serverTimestamp() : null,
        readAt: null,
        ...(imageData && { image: imageData }),
      };

      console.log(`Sending message to ${recipientId}: ${text}`);

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
    receivedRequests,
    outgoingRequests,
    searchResults,
    loading,
    error,
    activeChat,
    privateMessages,
    unreadMessages,
    searchUsers,
    sendContactRequest,
    acceptContactRequest,
    declineContactRequest,
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
