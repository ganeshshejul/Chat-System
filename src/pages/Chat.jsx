import { useEffect, useState, useRef, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import ChatMessage from '../components/ChatMessage.jsx';
import ChatInput from '../components/ChatInput.jsx';
import FirebaseSetupGuide from '../components/FirebaseSetupGuide.jsx';
import Sidebar from '../components/Sidebar.jsx';
import PrivateChat from '../components/PrivateChat.jsx';
import PrivateChatInput from '../components/PrivateChatInput.jsx';
import PublicChatHeader from '../components/PublicChatHeader.jsx';
import { useUser } from '../context/UserContext.jsx';
import { FaArrowDown } from 'react-icons/fa';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [firebaseError, setFirebaseError] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const { activeChat } = useUser();

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current && messagesEndRef.current) {
      // Use a small timeout to ensure the DOM has updated
      setTimeout(() => {
        // Method 1: Using scrollIntoView
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        // Method 2: Direct scroll manipulation (backup method)
        const container = messagesContainerRef.current;
        container.scrollTop = container.scrollHeight;
      }, 100);
    }
  }, []);

  // Check if user has scrolled up
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Show button if scrolled up more than 100px from bottom
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;

    setShowScrollButton(isScrolledUp);
  }, []);

  useEffect(() => {
    // Check if Firebase is properly configured
    const isFirebaseConfigured = db &&
      db._databaseId &&
      db._databaseId.projectId &&
      db._databaseId.projectId !== 'your_project_id' &&
      db._databaseId.projectId !== 'chat-app-demo-xxxxx';

    if (!isFirebaseConfigured) {
      setFirebaseError(true);
      return;
    }

    try {
      // Query messages from Firestore
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, orderBy('createdAt'), limit(100));

      // Listen for updates
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(messagesData);
      }, (error) => {
        console.error('Firestore error:', error);
        setFirebaseError(true);
      });

      // Clean up listener
      return unsubscribe;
    } catch (error) {
      console.error('Firebase setup error:', error);
      setFirebaseError(true);
      return () => {};
    }
  }, []);

  // Scroll to bottom whenever messages change - always scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Add scroll event listener
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);

      // Initial check
      handleScroll();

      return () => {
        messagesContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  // Ensure scroll to bottom when component mounts
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Show Firebase setup guide if there's a Firebase error
  if (firebaseError) {
    return <FirebaseSetupGuide />;
  }

  return (
    <div className="chat-page">
      <Sidebar />

      <div className="chat-container">
        {activeChat ? (
          // Show private chat if a contact is selected
          <>
            <PrivateChat />
            <PrivateChatInput />
          </>
        ) : (
          // Show group chat if no contact is selected
          <>
            <PublicChatHeader />
            <div className="messages-container" ref={messagesContainerRef}>
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => <ChatMessage key={msg.id} message={msg} />)
              )}
              <div ref={messagesEndRef} />

              <button
                className={`scroll-to-bottom-button ${showScrollButton ? 'visible' : ''}`}
                onClick={scrollToBottom}
                aria-label="Scroll to bottom"
                title="Scroll to bottom"
              >
                <FaArrowDown />
              </button>
            </div>
            <ChatInput />
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
