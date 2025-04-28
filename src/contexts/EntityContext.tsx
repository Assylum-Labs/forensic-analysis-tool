"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Entity } from '@/types';
import { toast } from '@/components/ui/use-toast';
import EntityService, { EntityFilters, PaginatedResult } from '@/lib/api-service';
import { entityCache } from '@/lib/EntityCacheService';

// Define the context type with pagination and cache
interface EntityContextType {
  entities: Entity[];
  isLoading: boolean;
  totalEntities: number;
  currentPage: number;
  pageSize: number;
  filters: EntityFilters;
  addEntity: (entity: Omit<Entity, 'createdAt' | 'updatedAt'>) => Promise<Entity>;
  updateEntity: (address: string, updates: Partial<Entity>) => Promise<Entity>;
  deleteEntity: (address: string) => Promise<void>;
  verifyEntity: (address: string, verified: boolean) => Promise<Entity>;
  addRelatedAddress: (address: string, relatedAddress: string) => Promise<Entity>;
  removeRelatedAddress: (address: string, relatedAddress: string) => Promise<Entity>;
  getEntityByAddress: (address: string) => Entity | undefined;
  searchEntities: (query: string, filterType?: string) => Promise<PaginatedResult<Entity>>;
  refreshEntities: () => Promise<void>;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Partial<EntityFilters>) => void;
  // New cache-specific methods
  clearEntityCache: () => void;
  forceRefreshCache: () => Promise<void>;
}

// Create the context
const EntityContext = createContext<EntityContextType | undefined>(undefined);

// Provider component
export const EntityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalEntities, setTotalEntities] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filters, setFilters] = useState<EntityFilters>({});
  const [cacheInitialized, setCacheInitialized] = useState<boolean>(false);

  // Initialize the cache on mount
  useEffect(() => {
    // Initialize the entity cache
    entityCache.initialize();
    setCacheInitialized(true);
    
    // Check if we need to refresh from server
    if (entityCache.needsRefresh()) {
      // Only load all entities for cache if it needs refreshing
      loadAllEntitiesForCache();
    }
  }, []);

  // Load all entities for the cache - separate from pagination
  const loadAllEntitiesForCache = async () => {
    try {
      // Load all entities without pagination for the cache
      const allEntities = await EntityService.getEntities({ limit: 1500 });
      
      // Update the cache with all entities
      entityCache.updateCache(allEntities.entities);
      
      console.log(`Cache refreshed with ${allEntities.entities.length} entities`);
    } catch (error) {
      console.error('Failed to load entities for cache:', error);
    }
  };

  // Memoized fetchEntities function to prevent recreation on each render
  const fetchEntities = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate offset based on current page and page size
      const offset = (currentPage - 1) * pageSize;
      
      // Prepare filters
      const apiFilters: EntityFilters = {
        ...filters,
        limit: pageSize,
        offset: offset
      };
      
      // Make API request
      const data = await EntityService.getEntities(apiFilters);
      setEntities(data.entities);
      setTotalEntities(data.total);
      
      // Update cache with these entities as well
      entityCache.updateCache(data.entities);
    } catch (error) {
      console.error('Failed to fetch entities:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load entity data',
        variant: 'destructive'
      });
      // Fallback to empty array
      setEntities([]);
      setTotalEntities(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  // Initial load of entities and when dependencies change
  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Add a new entity
  const addEntity = async (entityData: Omit<Entity, 'createdAt' | 'updatedAt'>): Promise<Entity> => {
    try {
      // Validate the entity
      if (!entityData.address) {
        throw new Error('Entity address is required');
      }

      // Make API request to create entity
      const newEntity = await EntityService.createEntity(entityData);
      
      // Update local state if we're on the first page or refresh entities
      if (currentPage === 1) {
        setEntities(prev => {
          // Maintain page size by removing the last item if we're at capacity
          const updatedEntities = prev.length >= pageSize 
            ? [newEntity, ...prev.slice(0, pageSize - 1)]
            : [newEntity, ...prev];
          return updatedEntities;
        });
        setTotalEntities(prev => prev + 1);
      } else {
        // If we're not on the first page, refresh the entity list
        await fetchEntities();
      }
      
      // Update the cache
      entityCache.updateEntity(newEntity);
      
      toast({
        title: 'Entity Added',
        description: `Successfully added ${newEntity.name || newEntity.address}`
      });

      return newEntity;
    } catch (error) {
      console.error('Failed to add entity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add entity',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Update an existing entity
  const updateEntity = async (address: string, updates: Partial<Entity>): Promise<Entity> => {
    try {
      // Make API request to update entity
      const updatedEntity = await EntityService.updateEntity(address, updates);
      
      // Update local state
      setEntities(prev => 
        prev.map(entity => 
          entity.address === address ? updatedEntity : entity
        )
      );
      
      // Update the cache
      entityCache.updateEntity(updatedEntity);

      toast({
        title: 'Entity Updated',
        description: `Successfully updated ${updatedEntity.name || updatedEntity.address}`
      });

      return updatedEntity;
    } catch (error) {
      console.error('Failed to update entity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update entity',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Delete an entity
  const deleteEntity = async (address: string): Promise<void> => {
    try {
      // Find the entity name before deleting for the toast message
      const entityToDelete = entities.find(e => e.address === address);
      const entityName = entityToDelete?.name || address;
      
      // Make API request to delete entity
      await EntityService.deleteEntity(address);
      
      // Update local state
      setEntities(prev => prev.filter(e => e.address !== address));
      setTotalEntities(prev => prev - 1);
      
      // Remove from cache
      entityCache.removeEntity(address);

      toast({
        title: 'Entity Deleted',
        description: `Successfully deleted ${entityName}`
      });
      
      // If we deleted the last entity on a page and there are more pages, go back one page
      if (entities.length === 1 && currentPage > 1) {
        setCurrentPage(prevPage => prevPage - 1);
      } else if (currentPage > 1 || entities.length > 1) {
        // If we're not on the first page or there are still entities, refresh
        await fetchEntities();
      }
    } catch (error) {
      console.error('Failed to delete entity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete entity',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Verify an entity
  const verifyEntity = async (address: string, verified: boolean): Promise<Entity> => {
    return updateEntity(address, { verified });
  };

  // Add a related address to an entity
  const addRelatedAddress = async (address: string, relatedAddress: string): Promise<Entity> => {
    try {
      // Make API request to add related address
      const updatedEntity = await EntityService.addRelatedAddress(address, relatedAddress);
      
      // Update local state
      setEntities(prev => 
        prev.map(entity => 
          entity.address === address ? updatedEntity : entity
        )
      );
      
      // Update cache
      entityCache.updateEntity(updatedEntity);

      toast({
        title: 'Related Address Added',
        description: `Successfully added related address to ${updatedEntity.name || updatedEntity.address}`
      });

      return updatedEntity;
    } catch (error) {
      console.error('Failed to add related address:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add related address',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Remove a related address from an entity
  const removeRelatedAddress = async (address: string, relatedAddress: string): Promise<Entity> => {
    try {
      // Make API request to remove related address
      const updatedEntity = await EntityService.removeRelatedAddress(address, relatedAddress);
      
      // Update local state
      setEntities(prev => 
        prev.map(entity => 
          entity.address === address ? updatedEntity : entity
        )
      );
      
      // Update cache
      entityCache.updateEntity(updatedEntity);

      toast({
        title: 'Related Address Removed',
        description: `Successfully removed related address from ${updatedEntity.name || updatedEntity.address}`
      });

      return updatedEntity;
    } catch (error) {
      console.error('Failed to remove related address:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove related address',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Get an entity by address - now uses cache for O(1) lookup
  const getEntityByAddress = (address: string): Entity | undefined => {
    // First check the cache for O(1) lookup
    return entityCache.getEntity(address);
  };

  // Search entities by name, address, or related addresses
  const searchEntities = async (query: string, filterType?: string): Promise<PaginatedResult<Entity>> => {
    setIsLoading(true);
    try {
      // Prepare search filters
      const searchFilters: EntityFilters = {
        search: query,
        type: filterType
      };
      
      // Make API request
      const data = await EntityService.getEntities(searchFilters);
      
      // Update cache with search results
      entityCache.updateCache(data.entities);
      
      return data;
    } catch (error) {
      console.error('Failed to search entities:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to search entities',
        variant: 'destructive'
      });
      return { entities: [], total: 0 };
    } finally {
      setIsLoading(false);
    }
  };

  // Force refresh entities
  const refreshEntities = async (): Promise<void> => {
    await fetchEntities();
  };
  
  // Clear the entity cache
  const clearEntityCache = (): void => {
    entityCache.clearCache();
    toast({
      title: 'Cache Cleared',
      description: 'Entity cache has been cleared'
    });
  };
  
  // Force a full cache refresh from server
  const forceRefreshCache = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await loadAllEntitiesForCache();
      toast({
        title: 'Cache Refreshed',
        description: `Entity cache refreshed with ${entityCache.size()} entities`
      });
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to refresh entity cache',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle filter changes in a way that avoids infinite loops
  const handleSetFilters = useCallback((newFilters: Partial<EntityFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
    // Only reset the page if we're not already on the first page
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  // Context value
  const value: EntityContextType = {
    entities,
    isLoading,
    totalEntities,
    currentPage,
    pageSize,
    filters,
    addEntity,
    updateEntity,
    deleteEntity,
    verifyEntity,
    addRelatedAddress,
    removeRelatedAddress,
    getEntityByAddress,
    searchEntities,
    refreshEntities,
    setCurrentPage,
    setPageSize,
    setFilters: handleSetFilters,
    clearEntityCache,
    forceRefreshCache
  };

  return (
    <EntityContext.Provider value={value}>
      {children}
    </EntityContext.Provider>
  );
};

// Custom hook to use the entity context
export const useEntities = (): EntityContextType => {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntities must be used within an EntityProvider');
  }
  return context;
};