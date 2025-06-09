import { FaFile, FaFileAlt, FaFileImage, FaFileAudio, FaFileVideo, FaDownload } from 'react-icons/fa';

const FilePreview = ({ file }) => {
  if (!file) return null;

  const { name, type, url, extension } = file;
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get file icon based on type
  const getFileIcon = () => {
    switch (type) {
      case 'image':
        return <FaFileImage />;
      case 'document':
        return <FaFileAlt />;
      case 'video':
        return <FaFileVideo />;
      case 'audio':
        return <FaFileAudio />;
      default:
        return <FaFile />;
    }
  };
  
  // Render different preview based on file type
  const renderPreview = () => {
    switch (type) {
      case 'image':
        return (
          <div className="file-image-preview">
            <img src={url} alt={name} />
          </div>
        );
      case 'video':
        return (
          <div className="file-video-preview">
            <video controls>
              <source src={url} type={`video/${extension}`} />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'audio':
        return (
          <div className="file-audio-preview">
            <audio controls>
              <source src={url} type={`audio/${extension}`} />
              Your browser does not support the audio tag.
            </audio>
          </div>
        );
      default:
        return (
          <div className="file-generic-preview">
            <div className="file-icon">{getFileIcon()}</div>
            <div className="file-info">
              <div className="file-name">{name}</div>
              {file.size && <div className="file-size">{formatFileSize(file.size)}</div>}
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className={`file-preview file-type-${type}`}>
      {renderPreview()}
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="file-download-link"
        download={name}
      >
        <FaDownload /> Download
      </a>
    </div>
  );
};

export default FilePreview;
