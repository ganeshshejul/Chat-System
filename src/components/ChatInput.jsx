import { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { FaPaperPlane } from 'react-icons/fa';

const ChatInput = () => {
  const [message, setMessage] = useState('');
  const { currentUser } = useAuth();
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

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    try {
      // Create message data
      const messageData = {
        text: message,
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        createdAt: serverTimestamp()
      };

      // Add message to Firestore
      await addDoc(collection(db, 'messages'), messageData);

      // Clear input field
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle key press events
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Send message on Enter (without Shift)
      if (!e.shiftKey) {
        e.preventDefault();
        sendMessage(e);
      }
      // When Shift+Enter is pressed, allow default behavior (new line)
    }
  };

  return (
    <form onSubmit={sendMessage} className="chat-input">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
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

export default ChatInput;
