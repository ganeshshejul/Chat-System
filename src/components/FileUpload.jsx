import { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config.js';
import { FaPaperclip, FaTimes } from 'react-icons/fa';

const FileUpload = ({ onFileUpload, onUploadProgress, onUploadError, onUploadCancel }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const uploadTaskRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    handleUpload(file);
  };

  const handleUpload = async (file) => {
    if (!file) return;

    try {
      setIsUploading(true);

      // Create a unique file name
      const fileName = `${Date.now()}_${file.name}`;
      const fileExtension = file.name.split('.').pop().toLowerCase();

      // Create a reference to the file in Firebase Storage
      const storageRef = ref(storage, `chat_files/${fileName}`);

      // Upload the file
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTaskRef.current = uploadTask;

      // Listen for upload progress
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onUploadProgress && onUploadProgress(progress);
        },
        (error) => {
          console.error('Error uploading file:', error);
          setIsUploading(false);
          setSelectedFile(null);
          onUploadError && onUploadError(error);
        },
        async () => {
          // Upload completed successfully
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Determine file type
          const fileType = getFileType(fileExtension);

          // Create file metadata
          const fileData = {
            name: file.name,
            type: fileType,
            size: file.size,
            url: downloadURL,
            extension: fileExtension
          };

          // Pass file data to parent component
          onFileUpload && onFileUpload(fileData);

          // Reset state
          setIsUploading(false);
          setSelectedFile(null);

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      );
    } catch (error) {
      console.error('Error starting file upload:', error);
      setIsUploading(false);
      setSelectedFile(null);
      onUploadError && onUploadError(error);
    }
  };

  const handleCancel = () => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      uploadTaskRef.current = null;
    }

    setIsUploading(false);
    setSelectedFile(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onUploadCancel && onUploadCancel();
  };

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  // Helper function to determine file type
  const getFileType = (extension) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'wmv', 'webm'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];

    if (imageExtensions.includes(extension)) return 'image';
    if (documentExtensions.includes(extension)) return 'document';
    if (videoExtensions.includes(extension)) return 'video';
    if (audioExtensions.includes(extension)) return 'audio';
    return 'other';
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*,audio/*"
      />

      {isUploading ? (
        <button
          type="button"
          className="cancel-upload-button"
          onClick={handleCancel}
          title="Cancel upload"
          aria-label="Cancel upload"
        >
          <FaTimes />
        </button>
      ) : (
        <button
          type="button"
          className="file-upload-button"
          onClick={handleButtonClick}
          title="Attach file"
          aria-label="Attach file"
        >
          <FaPaperclip />
        </button>
      )}
    </div>
  );
};

export default FileUpload;
