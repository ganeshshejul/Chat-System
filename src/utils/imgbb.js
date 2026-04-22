const IMGBB_API_KEY = 'e6351c435b8066e3af94c796782b2185';
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg'];

export const isAllowedImageType = (file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  return ALLOWED_TYPES.includes(file.type) && ALLOWED_EXTENSIONS.includes(ext);
};

export const uploadToImgBB = async (file, onProgress) => {
  if (!isAllowedImageType(file)) {
    throw new Error('Only PNG, JPG, and JPEG images are allowed.');
  }

  const formData = new FormData();
  formData.append('image', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success) {
          resolve({
            url: data.data.url,
            displayUrl: data.data.display_url,
            thumb: data.data.thumb?.url || data.data.url,
            name: file.name,
            size: file.size,
          });
        } else {
          reject(new Error(data.error?.message || 'ImgBB upload failed.'));
        }
      } catch {
        reject(new Error('Failed to parse ImgBB response.'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));

    xhr.open('POST', `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`);
    xhr.send(formData);
  });
};
