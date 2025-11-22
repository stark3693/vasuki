import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file) return null;

    console.log('Starting image upload:', file.name, file.type, file.size);

    // Validate file
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return null;
    }

    if (file.size > 50 * 1024 * 1024) {
      console.error('File too large:', file.size);
      toast({
        title: "File Too Large",
        description: "Image must be less than 50MB",
        variant: "destructive",
      });
      return null;
    }

    try {
      setUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append('image', file);

      console.log('Sending upload request to /api/nft-upload');

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
          console.log('Upload progress:', percentComplete);
        }
      });

      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.onload = () => {
          console.log('Upload response status:', xhr.status);
          console.log('Upload response:', xhr.responseText);
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Upload successful:', response);
              resolve(response.imageUrl);
            } catch (parseError) {
              console.error('Failed to parse response:', parseError);
              reject(new Error('Invalid response format'));
            }
          } else {
            console.error('Upload failed with status:', xhr.status);
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = (error) => {
          console.error('Upload error:', error);
          reject(new Error('Network error during upload'));
        };
      });

      xhr.open('POST', '/api/nft-upload');
      xhr.send(formData);

      const imageUrl = await uploadPromise;
      
      console.log('Upload completed successfully:', imageUrl);
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });

      return imageUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { uploadImage, uploading, progress };
}
