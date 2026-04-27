import { useRef, useEffect, useState, useCallback } from 'react';
import { useUser } from '../context/UserContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ChatMessage from './ChatMessage.jsx';
import { FaUser, FaTrash, FaArrowDown, FaUserTimes, FaArrowLeft } from 'react-icons/fa';

const PrivateChat = () => {
  const { activeChat, privateMessages, clearChat, removeContact, setActiveChat } = useUser();
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationType, setConfirmationType] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback((smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
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
    // Wait one frame for DOM layout updates before scrolling
    requestAnimationFrame(() => scrollToBottom(false));
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
    requestAnimationFrame(() => scrollToBottom(false));
  }, [scrollToBottom, activeChat]);

  useEffect(() => {
    if (!showActionsMenu) return;

    const handleClickOutside = (event) => {
      if (!actionsMenuRef.current?.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu]);

  const openConfirmation = (type) => {
    setConfirmationType(type);
    setShowConfirmation(true);
    setShowActionsMenu(false);
  };

  const handleConfirmAction = async () => {
    if (!activeChat) return;

    setIsProcessingAction(true);
    try {
      if (confirmationType === 'clear-chat') {
        await clearChat(activeChat.uid);
      }

      if (confirmationType === 'remove-contact') {
        await removeContact(activeChat.uid);
        setActiveChat(null);
      }

      setShowConfirmation(false);
      setConfirmationType(null);
    } catch (error) {
      console.error('Error performing action:', error);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setConfirmationType(null);
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
    createdAt: msg.createdAt,
    image: msg.image,
    status: msg.status || 'sent'
  }));

  const isActuallyOnline = (chatUser) => {
    if (!chatUser?.isOnline) return false;
    if (!chatUser.lastActive) return false;
    const lastActiveDate = chatUser.lastActive?.toDate
      ? chatUser.lastActive.toDate()
      : new Date(chatUser.lastActive);
    // Consider online only if lastActive within the last 5 minutes
    return (Date.now() - lastActiveDate.getTime()) < 5 * 60 * 1000;
  };

  const getLastSeenText = (chatUser) => {
    if (!chatUser) return '';
    if (isActuallyOnline(chatUser)) return 'online';
    if (!chatUser.lastSeen) return 'last seen recently';

    const seenDate = chatUser.lastSeen?.toDate ? chatUser.lastSeen.toDate() : new Date(chatUser.lastSeen);
    if (Number.isNaN(seenDate.getTime())) return 'last seen recently';

    const now = new Date();
    const isToday = seenDate.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = seenDate.toDateString() === yesterday.toDateString();

    const timeText = seenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `last seen today at ${timeText}`;
    if (isYesterday) return `last seen yesterday at ${timeText}`;

    const dateText = seenDate.toLocaleDateString([], { day: '2-digit', month: 'short' });
    return `last seen ${dateText} at ${timeText}`;
  };

  return (
    <div className="private-chat">
      <div className="private-chat-header">
        <div className="private-chat-leading">
          <button
            className="private-chat-back-btn"
            onClick={() => setActiveChat(null)}
            title="Back to Public Chat"
            aria-label="Back to Public Chat"
          >
            <FaArrowLeft />
          </button>
          <div className="private-chat-user">
            <FaUser className="private-chat-avatar" />
            <div className="private-chat-user-meta">
              <span className="private-chat-name">{activeChat.displayName}</span>
              <span className={`private-chat-presence ${isActuallyOnline(activeChat) ? 'online' : 'offline'}`}>
                {getLastSeenText(activeChat)}
              </span>
            </div>
          </div>
        </div>
        <div className="private-chat-actions">
          <div className="chat-actions-menu" ref={actionsMenuRef}>
            <button
              type="button"
              className="chat-actions-menu-btn"
              onClick={() => setShowActionsMenu((prev) => !prev)}
              title="Chat options"
              aria-label="Chat options"
            >
              <span className="menu-dots-symbol" aria-hidden="true">⋮</span>
            </button>

            {showActionsMenu && (
              <div className="chat-actions-dropdown" role="menu">
                <button
                  type="button"
                  className="chat-actions-item"
                  onClick={() => openConfirmation('clear-chat')}
                >
                  <FaTrash /> Clear Chat
                </button>
                <button
                  type="button"
                  className="chat-actions-item danger"
                  onClick={() => openConfirmation('remove-contact')}
                >
                  <FaUserTimes /> Remove Contact
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        {formattedMessages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          formattedMessages.map(msg => <ChatMessage key={msg.id} message={msg} showStatus />)
        )}
        <div ref={messagesEndRef} />
      </div>

      <button
        className={`scroll-to-bottom-button ${showScrollButton ? 'visible' : ''}`}
        onClick={scrollToBottom}
        aria-label="Scroll to bottom"
        title="Scroll to bottom"
      >
        <FaArrowDown />
      </button>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="confirmation-dialog-overlay">
          <div className="confirmation-dialog">
            <h3>{confirmationType === 'remove-contact' ? 'Remove Contact' : 'Clear Chat History'}</h3>
            {confirmationType === 'remove-contact' ? (
              <>
                <p>Remove {activeChat.displayName} from your contacts?</p>
                <p className="confirmation-note">You can add them again by sending a new request.</p>
              </>
            ) : (
              <>
                <p>Are you sure you want to clear all messages in this chat?</p>
                <p className="confirmation-warning">This action cannot be undone.</p>
              </>
            )}
            <div className="confirmation-actions">
              <button
                className="cancel-button"
                onClick={handleCancelConfirmation}
                disabled={isProcessingAction}
              >
                Cancel
              </button>
              <button
                className="confirm-button"
                onClick={handleConfirmAction}
                disabled={isProcessingAction}
              >
                {isProcessingAction
                  ? (confirmationType === 'remove-contact' ? 'Removing...' : 'Clearing...')
                  : (confirmationType === 'remove-contact' ? 'Remove Contact' : 'Clear Chat')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateChat;
