import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext.jsx';
import { FaPaperPlane, FaImage, FaSmile } from 'react-icons/fa';
import { uploadToImgBB, isAllowedImageType } from '../utils/imgbb.js';

const EMOJIS = ['😀', '😂', '😍', '🥳', '😎', '🤔', '😭', '😡', '👍', '👏', '🙏', '🔥', '❤️', '💯', '🎉', '✅', '👀', '🤝', '💬', '😅', '😴', '🤗', '🤖', '✨'];

const PrivateChatInput = () => {
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { activeChat, sendPrivateMessage } = useUser();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const emojiPickerRef = useRef(null);

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [message]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!emojiPickerRef.current?.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = useCallback((file) => {
    setUploadError('');
    if (!file) return;
    if (!isAllowedImageType(file)) {
      setUploadError('Only PNG, JPG, JPEG images are allowed.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleFileChange = (e) => {
    handleImageSelect(e.target.files[0]);
    e.target.value = '';
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setUploadError('');
  };

  // Drag & drop handlers — attached to document so the whole screen is a drop zone
  useEffect(() => {
    const onDragEnter = (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      dragCounterRef.current++;
      setIsDragging(true);
    };
    const onDragLeave = (e) => {
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) setIsDragging(false);
    };
    const onDragOver = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    };
    const onDrop = (e) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleImageSelect(file);
    };

    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [handleImageSelect]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!message.trim() && !imageFile) || !activeChat) return;

    setUploading(true);
    setUploadError('');
    try {
      let imageData = null;
      if (imageFile) {
        imageData = await uploadToImgBB(imageFile, setUploadProgress);
      }

      await sendPrivateMessage(message.trim(), activeChat.uid, imageData);
      setMessage('');
      setShowEmojiPicker(false);
      removeImage();
      setUploadProgress(0);
    } catch (error) {
      console.error('Error sending private message:', error);
      setUploadError(error.message || 'Failed to send message.');
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => `${prev}${emoji}`);
    textareaRef.current?.focus();
  };

  if (!activeChat) return null;

  const canSend = (message.trim() || imageFile) && !uploading;

  return (
    <>
      {isDragging && (
        <div className="drag-overlay">
          <FaImage />
          <span>Drop image here</span>
        </div>
      )}
    <form
      onSubmit={handleSendMessage}
      className="chat-input"
    >

      {imagePreview && (
        <div className="image-preview-container">
          <img src={imagePreview} alt="Preview" className="image-preview-thumb" />
          <div className="image-preview-info">
            <span className="image-preview-name">{imageFile?.name}</span>
            <button type="button" className="remove-image-btn" onClick={removeImage} title="Remove image">
              <span className="remove-image-icon" aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>
      )}

      {uploadError && <div className="upload-error">{uploadError}</div>}

      {uploading && (
        <div className="upload-progress-container">
          <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
          <span className="upload-progress-text">{uploadProgress}%</span>
        </div>
      )}

      <div className="input-container">
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="image-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Upload image (PNG, JPG, JPEG)"
          disabled={uploading}
        >
          <FaImage />
        </button>

        <div className="emoji-picker-wrap" ref={emojiPickerRef}>
          <button
            type="button"
            className={`emoji-toggle-btn ${showEmojiPicker ? 'active' : ''}`}
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Add emoji"
            aria-label="Add emoji"
            disabled={uploading}
          >
            <FaSmile />
          </button>

          {showEmojiPicker && (
            <div className="emoji-picker-panel" role="listbox" aria-label="Emoji picker">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="emoji-item-btn"
                  onClick={() => handleEmojiSelect(emoji)}
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDragging ? 'Drop image here...' : `Message ${activeChat.displayName}... (Enter to send)`}
          className="message-input"
          rows="1"
          disabled={uploading}
        />

        <div className="input-actions">
          <button
            type="submit"
            className="send-button"
            disabled={!canSend}
            title="Send message"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </form>
    </>
  );
};

export default PrivateChatInput;
