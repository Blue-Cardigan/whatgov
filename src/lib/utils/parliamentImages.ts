const STORAGE_KEY = 'parliament_images';
const NUM_IMAGES = 8;
const VALID_IMAGE_IDS = [
  15, 16, 18, 20, 22, 25, 27, 30, 32, 35,
  40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99
];

interface CacheData {
  urls: string[];
  timestamp: number;
}

class ParliamentImageManager {
  private static instance: ParliamentImageManager;
  private imageUrls: string[] = [];
  private currentIndex: number = 0;
  private preloadedImages: Map<string, HTMLImageElement> = new Map();
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): ParliamentImageManager {
    if (!this.instance) {
      this.instance = new ParliamentImageManager();
    }
    return this.instance;
  }

  private isCacheValid(timestamp: number): boolean {
    const now = new Date();
    const cacheDate = new Date(timestamp);
    return now.toDateString() === cacheDate.toDateString();
  }

  public async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise(async (resolve) => {
      const cachedData = localStorage.getItem(STORAGE_KEY);
      
      if (cachedData) {
        const { urls, timestamp }: CacheData = JSON.parse(cachedData);
        if (this.isCacheValid(timestamp)) {
          this.imageUrls = urls;
          await this.preloadImages();
          resolve();
          return;
        }
      }

      // Generate new URLs if cache is invalid or missing
      const baseUrl = "https://parliament.assetbank-server.com/assetbank-parliament/images/assetbox/8d1c697c-b070-4555-8da6-ed8e2c5ffd52/asset504";
      
      this.imageUrls = VALID_IMAGE_IDS
        .sort(() => Math.random() - 0.5)
        .slice(0, NUM_IMAGES)
        .map(id => `${baseUrl}${id.toString().padStart(2, '0')}_display.jpg`);

      // Save to cache with timestamp
      const cacheData: CacheData = {
        urls: this.imageUrls,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));

      await this.preloadImages();
      resolve();
    });

    return this.initPromise;
  }

  private async preloadImages(): Promise<void> {
    const preloadPromises = this.imageUrls.map(url => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.preloadedImages.set(url, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      });
    });

    await Promise.all(preloadPromises);
  }

  async getNextImage(): Promise<string> {
    await this.initialize();
    
    const url = this.imageUrls[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.imageUrls.length;
    
    return url;
  }

  clearCache(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.imageUrls = [];
    this.currentIndex = 0;
    this.preloadedImages.clear();
    this.initPromise = null;
  }
}

export const getNextParliamentImage = () => 
  ParliamentImageManager.getInstance().getNextImage();

export const clearParliamentImageCache = () => 
  ParliamentImageManager.getInstance().clearCache();

export const preloadParliamentImages = () => 
  ParliamentImageManager.getInstance().initialize(); 