import { useAuth } from '../context/AuthContext.jsx';
import { linkify } from '../utils/linkify.js';
import { FaCheck, FaCheckDouble } from 'react-icons/fa';

const ChatMessage = ({ message, showStatus = false }) => {
  const { currentUser } = useAuth();
  const { text, uid, displayName, createdAt, image, status } = message;

  const isOwnMessage = uid === currentUser?.uid;
  const messageClass = isOwnMessage ? 'sent' : 'received';

  const formattedTime = createdAt ? new Date(createdAt.toDate()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

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

  const renderMessageStatus = () => {
    if (!showStatus || !isOwnMessage) return null;

    if (status === 'read') {
      return (
        <span className="message-status read" title="Read">
          <FaCheckDouble />
        </span>
      );
    }

    if (status === 'delivered') {
      return (
        <span className="message-status delivered" title="Delivered">
          <FaCheckDouble />
        </span>
      );
    }

    return (
      <span className="message-status sent" title="Sent">
        <FaCheck />
      </span>
    );
  };

  return (
    <div className={`message ${messageClass}`}>
      <div className="message-content">
        <div className="message-info">
          <span className="message-sender">{displayName}</span>
          <span className="message-meta">
            <span className="message-time">{formattedTime}</span>
            {renderMessageStatus()}
          </span>
        </div>

        {image && (
          <div className="message-image-wrapper">
            <a href={image.url} target="_blank" rel="noopener noreferrer">
              <img
                src={image.displayUrl || image.url}
                alt={image.name || 'Image'}
                className="message-image"
                loading="lazy"
              />
            </a>
            <span className="message-image-name">{image.name}</span>
          </div>
        )}

        {text && (
          <p className="message-text">
            {text.split('\n').map((line, index, arr) => (
              <span key={index} className="message-line">
                {renderTextWithLinks(line)}
                {index < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
