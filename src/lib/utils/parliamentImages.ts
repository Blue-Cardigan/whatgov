const STORAGE_KEY = 'parliament_images';
const NUM_IMAGES = 8;
const MIN_ID = 15;
const MAX_ID = 99;
const AFTERNOON_REFRESH_HOUR = 12;
const AFTERNOON_REFRESH_MINUTE = 30;

interface CacheData {
  urls: string[];
  timestamp: number;
  lastUpdateDay: string;
  lastUpdatePeriod: 'morning' | 'afternoon';
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

  private getCurrentPeriod(): 'morning' | 'afternoon' {
    const now = new Date();
    const afternoonStart = new Date(now);
    afternoonStart.setHours(AFTERNOON_REFRESH_HOUR, AFTERNOON_REFRESH_MINUTE, 0, 0);
    
    return now >= afternoonStart ? 'afternoon' : 'morning';
  }

  private isCacheValid(lastUpdateDay: string, lastUpdatePeriod: 'morning' | 'afternoon'): boolean {
    const now = new Date();
    const today = now.toDateString();
    const currentPeriod = this.getCurrentPeriod();
    const cachedData = localStorage.getItem(STORAGE_KEY);
    
    if (cachedData) {
      const { urls } = JSON.parse(cachedData);
      
      // Cache is invalid if:
      // 1. We have no valid URLs
      // 2. It's from a different day
      // 3. It's from a different period (morning/afternoon) of the same day
      return urls.length > 0 && 
             lastUpdateDay === today && 
             lastUpdatePeriod === currentPeriod;
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

      const today = new Date().toDateString();
      const currentPeriod = this.getCurrentPeriod();
      const cachedData = localStorage.getItem(STORAGE_KEY);
      
      if (cachedData) {
        const { urls, lastUpdateDay, lastUpdatePeriod }: CacheData = JSON.parse(cachedData);
        if (this.isCacheValid(lastUpdateDay, lastUpdatePeriod)) {
          // Verify cached URLs are still valid
          const validationPromises = urls.map(url => this.validateImageUrl(url));
          const validResults = await Promise.all(validationPromises);
          this.validUrls = urls.filter((_, index) => validResults[index]);
          
          if (this.validUrls.length > 0) {
            resolve();
            return;
          }
        }
      }

      // If we get here, either cache was invalid or we had no valid URLs
      localStorage.removeItem(STORAGE_KEY);
      
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
        // Save valid URLs to cache with current day and period
        const cacheData: CacheData = {
          urls: this.validUrls,
          timestamp: Date.now(),
          lastUpdateDay: today,
          lastUpdatePeriod: currentPeriod
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      }

      resolve();
    });

    return this.initPromise;
  }

  public async checkAndUpdateCache(): Promise<void> {
    const cachedData = localStorage.getItem(STORAGE_KEY);
    if (cachedData) {
      const { lastUpdateDay, lastUpdatePeriod }: CacheData = JSON.parse(cachedData);
      const today = new Date().toDateString();
      const currentPeriod = this.getCurrentPeriod();
      
      if (lastUpdateDay !== today || lastUpdatePeriod !== currentPeriod) {
        // Force a cache refresh if it's a new day or new period
        this.clearCache();
        await this.initialize();
      }
    }
  }

  async getNextImage(): Promise<string> {
    await this.checkAndUpdateCache();
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