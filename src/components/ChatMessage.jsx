import { useAuth } from '../context/AuthContext.jsx';
import { linkify } from '../utils/linkify.js';

const ChatMessage = ({ message }) => {
  const { currentUser } = useAuth();
  const { text, uid, displayName, createdAt } = message;

  // Check if the message is from the current user
  const messageClass = uid === currentUser?.uid ? 'sent' : 'received';

  // Format timestamp
  const formattedTime = createdAt ? new Date(createdAt.toDate()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  // Process each line of text to detect and render links
  const renderTextWithLinks = (line) => {
    const segments = linkify(line);

    return segments.map((segment, i) => {
      if (segment.isUrl) {
        return (
          <a
            key={i}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="message-link"
          >
            {segment.text}
          </a>
        );
      }
      return <span key={i}>{segment.text}</span>;
    });
  };

  return (
    <div className={`message ${messageClass}`}>
      <div className="message-content">
        <div className="message-info">
          <span className="message-sender">{displayName}</span>
          <span className="message-time">{formattedTime}</span>
        </div>

        <p className="message-text">
          {text.split('\n').map((line, index) => (
            <span key={index} className="message-line">
              {renderTextWithLinks(line)}
              {index < text.split('\n').length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
