
/**
 * NDI Discovery Service
 * Provides functionality to discover NDI sources on the network
 */

export interface NdiSource {
  id: string;
  name: string;
  ipAddress: string;
  bandwidth?: 'low' | 'medium' | 'high';
  status?: 'available' | 'busy' | 'offline';
}

class NdiDiscoveryService {
  private sources: NdiSource[] = [];
  private isDiscovering: boolean = false;
  private discoveryInterval: number | null = null;
  private listeners: ((sources: NdiSource[]) => void)[] = [];
  
  constructor() {
    // Initialize with some mock sources for testing
    this.sources = [
      { id: 'ndi1', name: 'Camera 1', ipAddress: '192.168.1.100', bandwidth: 'high', status: 'available' },
      { id: 'ndi2', name: 'Camera 2', ipAddress: '192.168.1.101', bandwidth: 'medium', status: 'available' },
      { id: 'ndi3', name: 'Graphics', ipAddress: '192.168.1.102', bandwidth: 'low', status: 'available' },
    ];
  }
  
  // Get all currently known sources
  getSources(): NdiSource[] {
    return [...this.sources];
  }
  
  // Start discovering NDI sources
  startDiscovery(): boolean {
    if (this.isDiscovering) {
      return false;
    }
    
    this.isDiscovering = true;
    console.log('NDI discovery started');
    
    // Simulate NDI discovery with a timer
    // In a real implementation, this would use the NDI SDK
    this.discoveryInterval = window.setInterval(() => {
      const randomNum = Math.floor(Math.random() * 100);
      
      // Sometimes simulate finding a new source
      if (randomNum > 80 && this.sources.length < 10) {
        const newId = `ndi${this.sources.length + 1}`;
        const newSource: NdiSource = {
          id: newId,
          name: `NDI Source ${randomNum}`,
          ipAddress: `192.168.1.${randomNum}`,
          bandwidth: randomNum > 90 ? 'high' : randomNum > 85 ? 'medium' : 'low',
          status: 'available'
        };
        
        this.sources = [...this.sources, newSource];
        this.notifyListeners();
        console.log(`New NDI source discovered: ${newSource.name}`);
      }
    }, 2000);
    
    return true;
  }
  
  // Stop discovering NDI sources
  stopDiscovery(): boolean {
    if (!this.isDiscovering) {
      return false;
    }
    
    if (this.discoveryInterval !== null) {
      window.clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    
    this.isDiscovering = false;
    console.log('NDI discovery stopped');
    return true;
  }
  
  // Add a listener for NDI source updates
  addListener(callback: (sources: NdiSource[]) => void): void {
    this.listeners.push(callback);
  }
  
  // Remove a listener
  removeListener(callback: (sources: NdiSource[]) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
  
  // Notify all listeners of source changes
  private notifyListeners(): void {
    const sources = this.getSources();
    this.listeners.forEach(listener => {
      try {
        listener(sources);
      } catch (error) {
        console.error('Error in NDI listener:', error);
      }
    });
  }
}

export const ndiDiscoveryService = new NdiDiscoveryService();
export default ndiDiscoveryService;
