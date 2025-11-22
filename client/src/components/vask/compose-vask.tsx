import { useState, useRef } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useEncryption } from "@/hooks/use-encryption";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ipfsService } from "@/lib/ipfs";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Image, BarChart3, X, Upload, Video, FileText, Send } from "lucide-react";

interface ComposeVaskProps {
  onPosted?: () => void;
}

export default function ComposeVask({ onPosted }: ComposeVaskProps = {}) {
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useWallet();
  const { encryptText, isEncryptionAvailable } = useEncryption();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type.includes('pdf') || file.type.includes('document');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type.`,
          variant: "destructive",
        });
      }
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 50MB.`,
          variant: "destructive",
        });
      }
      
      return isValidType && isValidSize;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Create previews for images and videos
    validFiles.forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const createVaskMutation = useMutation({
    mutationFn: async (vaskData: { 
      content?: string; 
      contentEncrypted?: any;
      authorId: string; 
      imageUrl?: string; 
      imageHash?: string; 
      ipfsHash?: string;
      isEncrypted?: boolean;
      mediaUrls?: string[];
      mediaTypes?: string[];
      mediaFilenames?: string[];
      mediaSizes?: number[];
    }) => {
      const response = await apiRequest('POST', '/api/vasks', vaskData);
      return response.json();
    },
    onSuccess: () => {
      setContent("");
      setSelectedFiles([]);
      setFilePreviews([]);
      queryClient.invalidateQueries({ queryKey: ['/api/vasks'] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'vasks'] });
      }
      toast({
        title: "Vask Posted!",
        description: "Your vask has been published to the decentralized web.",
      });
      onPosted?.();
    },
    onError: () => {
      toast({
        title: "Post Failed",
        description: "Failed to post your vask. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 50MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePost = async () => {
    if ((!content.trim() && selectedFiles.length === 0) || !user) return;

    try {
      let vaskData: any = {
        authorId: user.id,
        isEncrypted: isEncryptionAvailable,
      };

      // Add content if provided
      if (content.trim()) {
        const ipfsResponse = await ipfsService.uploadText(content);
        
        if (isEncryptionAvailable) {
          // Encrypt the content
          const encryptedContent = encryptText(content.trim());
          vaskData.contentEncrypted = encryptedContent;
          vaskData.content = content.trim(); // Keep original content for validation
        } else {
          vaskData.content = content.trim();
        }
        
        vaskData.ipfsHash = ipfsResponse.hash;
      }

      // Handle media upload
      if (selectedFiles.length > 0) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('authorId', user.id);
        formData.append('isEncrypted', isEncryptionAvailable.toString());
        
        if (content.trim()) {
          if (isEncryptionAvailable) {
            // Encrypt the content for media posts too
            const encryptedContent = encryptText(content.trim());
            formData.append('contentEncrypted', JSON.stringify(encryptedContent));
            formData.append('content', content.trim()); // Keep original content for validation
          } else {
            formData.append('content', content.trim());
          }
        }
        
        // Add all files
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });
        
        const response = await fetch('/api/vasks', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload image');
        }
        
        const result = await response.json();
        queryClient.invalidateQueries({ queryKey: ['/api/vasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'vasks'] });
        
        setContent("");
        setSelectedFiles([]);
        setFilePreviews([]);
        
        toast({
          title: "Vask Posted!",
          description: "Your vask has been published to the decentralized web.",
        });
        onPosted?.();
        return;
      }
      
      // For text-only vasks, use the original method
      await createVaskMutation.mutateAsync(vaskData);
    } catch (error) {
      console.error("Failed to create vask:", error);
      toast({
        title: "Post Failed",
        description: error instanceof Error ? error.message : "Failed to create vask. Please try again.",
        variant: "destructive",
      });
    }
  };

  const characterCount = content.length;
  const maxLength = 280;
  const isDisabled = (!content.trim() && selectedFiles.length === 0) || characterCount > maxLength || createVaskMutation.isPending || uploading;

  if (!user) return null;

  return (
    <div className="space-y-3 sm:space-y-4 serpent-border mobile-padding">
      <div className="flex space-x-2 sm:space-x-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0 trishul-decoration animate-mystical-glow">
          <span className="text-white font-medium text-sm sm:text-base">
            {(user.displayName || user.ensName || user.walletAddress)[0].toUpperCase()}
          </span>
        </div>
        <div 
          className="flex-1 relative"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Textarea
            placeholder={dragActive ? "Drop files here..." : "What's happening in Web3?"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`w-full bg-transparent text-base sm:text-lg md:text-xl placeholder-muted-foreground resize-none border-none outline-none ring-0 focus-visible:ring-0 min-h-[100px] sm:min-h-[120px] responsive-text-base transition-colors ${
              dragActive ? 'bg-blue-50 dark:bg-blue-950' : ''
            }`}
            maxLength={maxLength}
            data-testid="textarea-compose"
          />
          
          {dragActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 rounded-lg border-2 border-dashed border-blue-500 pointer-events-none">
              <div className="text-center">
                <Upload className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-blue-600 font-medium">Drop files here</p>
              </div>
            </div>
          )}
          
          {/* File Previews */}
          {filePreviews.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {filePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    {selectedFiles[index]?.type.startsWith('image/') ? (
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="max-w-full max-h-32 rounded-lg object-cover"
                      />
                    ) : selectedFiles[index]?.type.startsWith('video/') ? (
                      <video 
                        src={preview} 
                        className="max-w-full max-h-32 rounded-lg object-cover"
                        controls
                      />
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 text-destructive hover:text-destructive bg-background/80 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* File List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                      {getFileIcon(file)}
                      <span className="truncate">{file.name}</span>
                      <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pl-12 sm:pl-15">
        <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-muted-foreground">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="hover:text-primary transition-colors mobile-touch-target"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-add-media"
          >
            <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hover:text-primary transition-colors mobile-touch-target"
            disabled
            data-testid="button-add-poll"
          >
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <span 
            className={`text-xs sm:text-sm ${characterCount > maxLength ? 'text-destructive' : ''} responsive-text-xs`}
            data-testid="text-character-count"
          >
            {characterCount}/{maxLength}
          </span>
        </div>
        <Button
          onClick={handlePost}
          disabled={isDisabled}
          className="creative-gradient emotion-hover py-2 px-4 sm:px-6 rounded-full text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed mobile-touch-target responsive-text-sm"
          data-testid="button-post-vask"
        >
          {createVaskMutation.isPending || uploading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
              <span className="hidden sm:inline">{uploading ? "Uploading..." : "Posting..."}</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Post Vask</span>
              <span className="sm:hidden">Post</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
