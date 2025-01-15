const STORAGE_KEY = 'parliament_images';
const NUM_IMAGES = 8;
const MIN_ID = 15;
const MAX_ID = 99;

interface CacheData {
  urls: string[];
  timestamp: number;
}

class ParliamentImageManager {
  private static instance: ParliamentImageManager;
  private imageUrls: string[] = [];
  private validUrls: string[] = [];
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
    const cachedData = localStorage.getItem(STORAGE_KEY);
    
    if (cachedData) {
      const { urls } = JSON.parse(cachedData);
      // Cache is invalid if we have no valid URLs or if it's from a different day
      return urls.length > 0 && now.toDateString() === cacheDate.toDateString();
    }
    
    return false;
  }

  private validateImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      const timeoutId = setTimeout(() => {
        img.src = '';  // Cancel the image loading
        resolve(false);
      }, 5000);  // 5 second timeout

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };

      img.src = url;
    });
  }

  private generateUrl(id: number): string {
    return `https://parliament.assetbank-server.com/assetbank-parliament/images/assetbox/8d1c697c-b070-4555-8da6-ed8e2c5ffd52/504${id.toString()}_display.jpg`;
  }

  public async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise(async (resolve) => {
      // Clear instance properties
      this.validUrls = [];
      this.currentIndex = 0;
      this.preloadedImages.clear();

      const cachedData = localStorage.getItem(STORAGE_KEY);
      
      if (cachedData) {
        const { urls, timestamp }: CacheData = JSON.parse(cachedData);
        if (this.isCacheValid(timestamp)) {
          // Verify cached URLs are still valid
          const validationPromises = urls.map(url => this.validateImageUrl(url));
          const validResults = await Promise.all(validationPromises);
          this.validUrls = urls.filter((_, index) => validResults[index]);
          
          if (this.validUrls.length > 0) {
            console.log(`Found ${this.validUrls.length} valid cached images`);
            resolve();
            return;
          }
        }
      }

      // If we get here, either cache was invalid or we had no valid URLs
      localStorage.removeItem(STORAGE_KEY);
      console.log('Cache invalid or empty, checking for new images...');
      
      // Check all IDs from MIN_ID to MAX_ID
      const allIds = Array.from(
        { length: MAX_ID - MIN_ID + 1 }, 
        (_, i) => i + MIN_ID
      );

      // Validate URLs in chunks
      const chunkSize = 5;
      this.validUrls = [];

      for (let i = 0; i < allIds.length; i += chunkSize) {
        const chunk = allIds.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async id => {
          const url = this.generateUrl(id);
          const isValid = await this.validateImageUrl(url);
          if (isValid) {
            console.log(`Found valid image: ${url}`);
            this.validUrls.push(url);
          }
          return isValid;
        });

        await Promise.all(chunkPromises);

        // If we have enough valid URLs, we can stop checking
        if (this.validUrls.length >= NUM_IMAGES) {
          break;
        }
      }

      // Randomly select NUM_IMAGES from valid URLs if we have more than needed
      if (this.validUrls.length > NUM_IMAGES) {
        this.validUrls = this.validUrls
          .sort(() => Math.random() - 0.5)
          .slice(0, NUM_IMAGES);
      }

      if (this.validUrls.length === 0) {
        console.error('No valid parliament images found');
      } else {
        console.log(`Found ${this.validUrls.length} valid images, saving to cache`);
        // Save valid URLs to cache
        const cacheData: CacheData = {
          urls: this.validUrls,
          timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      }

      resolve();
    });

    return this.initPromise;
  }

  async getNextImage(): Promise<string> {
    console.log('getNextImage')
    await this.initialize();
    
    if (this.validUrls.length === 0) {
      throw new Error('No valid parliament images available');
    }
    
    const url = this.validUrls[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.validUrls.length;
    
    return url;
  }

  clearCache(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.imageUrls = [];
    this.validUrls = [];
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