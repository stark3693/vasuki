// IPFS integration for storing Vasks
export interface IPFSResponse {
  hash: string;
  size: number;
}

export class IPFSService {
  private readonly apiUrl = 'https://api.pinata.cloud/pinning';
  private readonly gateway = 'https://gateway.pinata.cloud/ipfs';

  async uploadJSON(data: any): Promise<IPFSResponse> {
    // For demo purposes, we'll simulate IPFS upload
    // In production, you'd use a service like Pinata, Infura, or run your own IPFS node
    
    const mockHash = this.generateMockHash(JSON.stringify(data));
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      hash: mockHash,
      size: JSON.stringify(data).length
    };
  }

  async uploadText(text: string): Promise<IPFSResponse> {
    const mockHash = this.generateMockHash(text);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      hash: mockHash,
      size: text.length
    };
  }

  async uploadFile(file: File): Promise<IPFSResponse> {
    // For demo purposes, we'll create a data URL and store it
    // In production, you'd upload the actual file to IPFS
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const mockHash = this.generateMockHash(dataUrl);
        
        // Store the data URL in localStorage for demo purposes
        localStorage.setItem(`ipfs_${mockHash}`, dataUrl);
        
        // Simulate network delay for file upload
        setTimeout(() => {
          resolve({
            hash: mockHash,
            size: file.size
          });
        }, 1000);
      };
      reader.readAsDataURL(file);
    });
  }

  async getContent(hash: string): Promise<any> {
    // In production, you'd fetch from IPFS gateway
    // For demo, we'll return a mock response
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      content: `Content for hash: ${hash}`,
      retrieved: new Date().toISOString()
    };
  }

  getGatewayUrl(hash: string): string {
    // For demo purposes, retrieve the stored data URL
    // In production, you'd return the actual IPFS gateway URL
    const storedDataUrl = localStorage.getItem(`ipfs_${hash}`);
    if (storedDataUrl) {
      return storedDataUrl;
    }
    
    // Fallback to placeholder if not found
    return `https://picsum.photos/400/300?random=${hash}`;
  }

  private generateMockHash(content: string): string {
    // Generate a mock IPFS-like hash (Qm... format)
    const hash = this.simpleHash(content);
    return `Qm${hash.substring(0, 44)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).padStart(44, '0');
  }

  async pinContent(hash: string): Promise<boolean> {
    // Simulate pinning content to keep it available
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
}

export const ipfsService = new IPFSService();
