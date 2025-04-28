// src/lib/EntityCacheService.ts
import { Entity } from '@/types';

const ENTITY_CACHE_KEY = 'solana_forensics_entity_cache';
const ENTITY_CACHE_TIMESTAMP_KEY = 'solana_forensics_entity_cache_timestamp';
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Service to manage entity caching in localStorage
 */
export class EntityCacheService {
  private static instance: EntityCacheService;
  private entityCache: Record<string, Entity> = {};
  private initialized = false;

  /**
   * Get the singleton instance of the cache service
   */
  public static getInstance(): EntityCacheService {
    if (!EntityCacheService.instance) {
      EntityCacheService.instance = new EntityCacheService();
    }
    return EntityCacheService.instance;
  }

  /**
   * Initialize the cache from localStorage or create a new one
   */
  public initialize(): void {
    if (this.initialized) return;
    
    try {
      // Check if localStorage is available (browser environment)
      if (typeof window !== 'undefined' && window.localStorage) {
        // Load cache from localStorage
        const cachedData = localStorage.getItem(ENTITY_CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(ENTITY_CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          
          // Check if cache is still valid
          if (now - timestamp < CACHE_EXPIRATION) {
            this.entityCache = JSON.parse(cachedData);
            this.initialized = true;
            console.log(`Entity cache loaded: ${Object.keys(this.entityCache).length} entities`);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error initializing entity cache:', error);
      // If there's an error, reset the cache
      this.entityCache = {};
    }
    
    this.initialized = true;
  }

  /**
   * Update the cache with a list of entities
   */
  public updateCache(entities: Entity[]): void {
    if (!this.initialized) this.initialize();

    try {
      // Process the entities into the cache
      entities.forEach(entity => {
        this.entityCache[entity.address] = entity;
        
        // Also index related addresses if any
        if (entity.relatedAddresses && Array.isArray(entity.relatedAddresses)) {
          entity.relatedAddresses.forEach(relatedAddr => {
            // Only add if it doesn't exist or if it's a placeholder entry
            if (!this.entityCache[relatedAddr] || !this.entityCache[relatedAddr].name) {
              // Create a reference entry for the related address pointing to the main entity
              this.entityCache[relatedAddr] = {
                ...entity,
                address: relatedAddr,
                isRelatedTo: entity.address // Mark that this is related to another entity
              };
            }
          });
        }
      });
      
      // Persist to localStorage if available
      this.persistToLocalStorage();
    } catch (error) {
      console.error('Error updating entity cache:', error);
    }
  }

  /**
   * Add or update a single entity in the cache
   */
  public updateEntity(entity: Entity): void {
    if (!this.initialized) this.initialize();
    
    try {
      // Add/update the entity in the cache
      this.entityCache[entity.address] = entity;
      
      // Update related addresses
      if (entity.relatedAddresses && Array.isArray(entity.relatedAddresses)) {
        // First, remove any existing references to this entity from the cache
        Object.keys(this.entityCache).forEach(addr => {
          if (this.entityCache[addr].isRelatedTo === entity.address) {
            delete this.entityCache[addr];
          }
        });
        
        // Then add the current related addresses
        entity.relatedAddresses.forEach(relatedAddr => {
          if (!this.entityCache[relatedAddr] || !this.entityCache[relatedAddr].name) {
            this.entityCache[relatedAddr] = {
              ...entity,
              address: relatedAddr,
              isRelatedTo: entity.address
            };
          }
        });
      }
      
      // Persist to localStorage
      this.persistToLocalStorage();
    } catch (error) {
      console.error('Error updating entity in cache:', error);
    }
  }

  /**
   * Remove an entity from the cache
   */
  public removeEntity(address: string): void {
    if (!this.initialized) this.initialize();
    
    try {
      // Remove the entity
      if (this.entityCache[address]) {
        const entity = this.entityCache[address];
        delete this.entityCache[address];
        
        // Also remove any related addresses
        if (entity.relatedAddresses && Array.isArray(entity.relatedAddresses)) {
          entity.relatedAddresses.forEach(relatedAddr => {
            if (this.entityCache[relatedAddr]?.isRelatedTo === address) {
              delete this.entityCache[relatedAddr];
            }
          });
        }
        
        // Also clean up any entries that reference this address
        Object.keys(this.entityCache).forEach(addr => {
          if (this.entityCache[addr].isRelatedTo === address) {
            delete this.entityCache[addr];
          }
        });
      }
      
      // Persist changes
      this.persistToLocalStorage();
    } catch (error) {
      console.error('Error removing entity from cache:', error);
    }
  }

  /**
   * Get an entity by address with O(1) lookup
   */
  public getEntity(address: string): Entity | undefined {
    if (!this.initialized) this.initialize();
    return this.entityCache[address];
  }

  /**
   * Get all entities as an array
   */
  public getAllEntities(): Entity[] {
    if (!this.initialized) this.initialize();
    
    // Filter out related address entries to avoid duplicates
    return Object.values(this.entityCache).filter(entity => !entity.isRelatedTo);
  }

  /**
   * Check if the cache needs to be refreshed
   */
  public needsRefresh(): boolean {
    if (!this.initialized) this.initialize();
    
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cachedTimestamp = localStorage.getItem(ENTITY_CACHE_TIMESTAMP_KEY);
        
        if (cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          
          // If cache is older than expiration time, it needs refresh
          return now - timestamp > CACHE_EXPIRATION;
        }
      }
    } catch (error) {
      console.error('Error checking cache refresh status:', error);
    }
    
    // If any error or no timestamp, assume refresh is needed
    return true;
  }

  /**
   * Clear the entire cache
   */
  public clearCache(): void {
    this.entityCache = {};
    
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(ENTITY_CACHE_KEY);
        localStorage.removeItem(ENTITY_CACHE_TIMESTAMP_KEY);
      }
    } catch (error) {
      console.error('Error clearing entity cache:', error);
    }
  }

  /**
   * Get the number of entities in the cache
   */
  public size(): number {
    return Object.keys(this.entityCache).length;
  }

  /**
   * Save the cache to localStorage
   */
  private persistToLocalStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(ENTITY_CACHE_KEY, JSON.stringify(this.entityCache));
        localStorage.setItem(ENTITY_CACHE_TIMESTAMP_KEY, Date.now().toString());
      }
    } catch (error) {
      console.error('Error saving entity cache to localStorage:', error);
    }
  }
}

// Create and export singleton instance
export const entityCache = EntityCacheService.getInstance();

export default entityCache;