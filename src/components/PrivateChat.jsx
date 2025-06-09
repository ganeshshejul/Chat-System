import { useRef, useEffect, useState, useCallback } from 'react';
import { useUser } from '../context/UserContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ChatMessage from './ChatMessage.jsx';
import { FaUser, FaTrash, FaArrowDown } from 'react-icons/fa';

const PrivateChat = () => {
  const { activeChat, privateMessages, clearChat } = useUser();
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

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

  // Scroll to bottom whenever messages change - always scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [privateMessages, scrollToBottom]);

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

  // Ensure scroll to bottom when component mounts or active chat changes
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom, activeChat]);

  // Handle clear chat button click
  const handleClearChatClick = () => {
    setShowConfirmation(true);
  };

  // Handle confirmation dialog
  const handleConfirmClear = async () => {
    if (!activeChat) return;

    setIsClearing(true);
    try {
      await clearChat(activeChat.uid);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error clearing chat:', error);
    } finally {
      setIsClearing(false);
    }
  };

  // Handle cancel clear
  const handleCancelClear = () => {
    setShowConfirmation(false);
  };

  if (!activeChat) {
    return (
      <div className="private-chat-placeholder">
        <div className="placeholder-content">
          <FaUser className="placeholder-icon" />
          <h3>Select a contact to start chatting</h3>
          <p>Or search for users to add new contacts</p>
        </div>
      </div>
    );
  }

  // Format messages for the ChatMessage component
  const formattedMessages = privateMessages.map(msg => ({
    id: msg.id,
    text: msg.text,
    uid: msg.senderId,
    displayName: msg.senderName,
    createdAt: msg.createdAt
  }));

  return (
    <div className="private-chat">
      <div className="private-chat-header">
        <div className="private-chat-user">
          <FaUser className="private-chat-avatar" />
          <span className="private-chat-name">{activeChat.displayName}</span>
        </div>
        <div className="private-chat-actions">
          <button
            className="clear-chat-button"
            onClick={handleClearChatClick}
            title="Clear chat history"
          >
            <FaTrash /> Clear Chat
          </button>
        </div>
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        {formattedMessages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          formattedMessages.map(msg => <ChatMessage key={msg.id} message={msg} />)
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

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="confirmation-dialog-overlay">
          <div className="confirmation-dialog">
            <h3>Clear Chat History</h3>
            <p>Are you sure you want to clear all messages in this chat?</p>
            <p className="confirmation-warning">This action cannot be undone.</p>
            <div className="confirmation-actions">
              <button
                className="cancel-button"
                onClick={handleCancelClear}
                disabled={isClearing}
              >
                Cancel
              </button>
              <button
                className="confirm-button"
                onClick={handleConfirmClear}
                disabled={isClearing}
              >
                {isClearing ? 'Clearing...' : 'Clear Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateChat;
