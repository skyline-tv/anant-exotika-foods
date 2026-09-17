import api from './api';

export async function uploadImages(files, onProgress) {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append('images', file);
  });

  const { data } = await api.post('/upload/product-images', formData, {
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      onProgress(Math.round((event.loaded * 100) / event.total));
    },
  });

  return data.data.images || [];
}
