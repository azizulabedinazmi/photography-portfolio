/**
 * Smart Image Preloader
 * Automatically preloads all images in the background as fast as possible
 * Uses IndexedDB for caching to enable offline viewing
 */

class ImagePreloader {
  constructor() {
    this.dbName = 'PhotographyPortfolioDB';
    this.storeName = 'imageCache';
    this.db = null;
    this.preloadedUrls = new Set();
    this.preloadingQueue = [];
    this.isPreloading = false;
    this.init();
  }

  async init() {
    // Initialize IndexedDB for offline caching
    try {
      await this.initIndexedDB();
    } catch (e) {
      console.log('IndexedDB not available, will use memory cache only');
    }

    // Start preloading immediately
    this.startPreloading();
  }

  initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async cacheImage(url) {
    if (!this.db) return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.put(blob, url);
    } catch (error) {
      console.log(`Failed to cache image ${url}:`, error.message);
    }
  }

  async preloadImage(url) {
    if (this.preloadedUrls.has(url)) {
      return Promise.resolve();
    }

    this.preloadedUrls.add(url);

    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = async () => {
        // Cache the image for offline access
        await this.cacheImage(url);
        resolve();
      };

      img.onerror = async () => {
        // Still try to cache even if display failed
        await this.cacheImage(url);
        resolve();
      };

      img.crossOrigin = 'anonymous';
      img.src = url;

      // Timeout after 30 seconds per image
      setTimeout(() => resolve(), 30000);
    });
  }

  async startPreloading() {
    // Get all image URLs from the page
    const imageUrls = this.getAllImageUrls();
    
    // Prioritize visible images first
    const visibleImages = this.getVisibleImageUrls();
    const offScreenImages = imageUrls.filter(url => !visibleImages.includes(url));

    // Create queue: visible images first, then the rest
    this.preloadingQueue = [...visibleImages, ...offScreenImages];

    // Start concurrent preloading (max 4 concurrent)
    this.loadNextImages();
  }

  async loadNextImages() {
    if (this.isPreloading || this.preloadingQueue.length === 0) return;

    this.isPreloading = true;
    const batchSize = 4; // Load 4 images concurrently
    const batch = this.preloadingQueue.splice(0, batchSize);

    try {
      await Promise.all(batch.map(url => this.preloadImage(url)));
    } catch (error) {
      console.error('Batch preload error:', error);
    }

    this.isPreloading = false;

    // Continue with next batch if queue not empty
    if (this.preloadingQueue.length > 0) {
      // Use requestIdleCallback for non-blocking background loading
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => this.loadNextImages(), { timeout: 1000 });
      } else {
        setTimeout(() => this.loadNextImages(), 100);
      }
    }
  }

  getAllImageUrls() {
    const urls = [];
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src) urls.push(img.src);
    });
    const links = document.querySelectorAll('a[href*=".jpg"], a[href*=".jpeg"], a[href*=".png"], a[href*=".webp"]');
    links.forEach(link => {
      if (link.href && (link.href.includes('.jpg') || link.href.includes('.jpeg') || link.href.includes('.png') || link.href.includes('.webp'))) {
        urls.push(link.href);
      }
    });
    return [...new Set(urls)]; // Remove duplicates
  }

  getVisibleImageUrls() {
    const urls = [];
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && this.isElementInViewport(img)) {
        urls.push(img.src);
      }
    });
    return urls;
  }

  isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth &&
      rect.bottom > 0 &&
      rect.right > 0
    );
  }
}

// Initialize preloader when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ImagePreloader();
  });
} else {
  new ImagePreloader();
}
