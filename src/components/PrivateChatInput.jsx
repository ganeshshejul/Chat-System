import { useState, useRef, useEffect } from 'react';
import { useUser } from '../context/UserContext.jsx';
import { FaPaperPlane } from 'react-icons/fa';

const PrivateChatInput = () => {
  const [message, setMessage] = useState('');
  const { activeChat, sendPrivateMessage } = useUser();
  const textareaRef = useRef(null);

  // Function to auto-resize the textarea
  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to the scrollHeight
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  // Auto-resize when message changes
  useEffect(() => {
    autoResizeTextarea();
  }, [message]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim() || !activeChat) return;

    try {
      // Send private message
      await sendPrivateMessage(message, activeChat.uid);

      // Clear input field
      setMessage('');
    } catch (error) {
      console.error('Error sending private message:', error);
    }
  };

  // Handle key press events
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Send message on Enter (without Shift)
      if (!e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e);
      }
      // When Shift+Enter is pressed, allow default behavior (new line)
    }
  };

  if (!activeChat) return null;

  return (
    <form onSubmit={handleSendMessage} className="chat-input">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${activeChat.displayName}... (Enter to send, Shift+Enter for new line)`}
          className="message-input"
          rows="1"
        />

        <div className="input-actions">
          <button
            type="submit"
            className="send-button"
            disabled={!message.trim()}
            title="Send message"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </form>
  );
};

export default PrivateChatInput;
