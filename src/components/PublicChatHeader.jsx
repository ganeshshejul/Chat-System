import { useState } from 'react';
import { useUser } from '../context/UserContext.jsx';
import { FaUsers, FaTrash } from 'react-icons/fa';

const PublicChatHeader = () => {
  const { clearPublicChat } = useUser();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // Handle clear chat button click
  const handleClearChatClick = () => {
    setShowConfirmation(true);
  };
  
  // Handle confirmation dialog
  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await clearPublicChat();
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error clearing public chat:', error);
    } finally {
      setIsClearing(false);
    }
  };
  
  // Handle cancel clear
  const handleCancelClear = () => {
    setShowConfirmation(false);
  };
  
  return (
    <div className="public-chat-header">
      <div className="public-chat-title">
        <FaUsers className="public-chat-icon" />
        <span className="public-chat-name">Public Chat</span>
      </div>
      
      <div className="public-chat-actions">
        <button 
          className="clear-chat-button" 
          onClick={handleClearChatClick}
          title="Clear chat history"
        >
          <FaTrash /> Clear Chat
        </button>
      </div>
      
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="confirmation-dialog-overlay">
          <div className="confirmation-dialog">
            <h3>Clear Public Chat</h3>
            <p>Are you sure you want to clear all messages in the public chat?</p>
            <p className="confirmation-warning">This action cannot be undone and will affect all users.</p>
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

export default PublicChatHeader;
