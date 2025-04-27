"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Entity } from '@/types';
import { toast } from '@/components/ui/use-toast';

// Default entity data (will be replaced with actual data)
const defaultEntities: Entity[] = [];

// Define the context type
interface EntityContextType {
  entities: Entity[];
  isLoading: boolean;
  addEntity: (entity: Omit<Entity, 'createdAt' | 'updatedAt'>) => Promise<Entity>;
  updateEntity: (address: string, updates: Partial<Entity>) => Promise<Entity>;
  deleteEntity: (address: string) => Promise<void>;
  verifyEntity: (address: string, verified: boolean) => Promise<Entity>;
  addRelatedAddress: (address: string, relatedAddress: string) => Promise<Entity>;
  removeRelatedAddress: (address: string, relatedAddress: string) => Promise<Entity>;
  getEntityByAddress: (address: string) => Entity | undefined;
  searchEntities: (query: string, filterType?: string) => Entity[];
  refreshEntities: () => Promise<void>;
}

// Create the context
const EntityContext = createContext<EntityContextType | undefined>(undefined);

// API endpoints (would come from env in a production app)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4600';
const ENTITIES_ENDPOINT = `${API_URL}/entities`;

// Provider component
export const EntityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entities, setEntities] = useState<Entity[]>(defaultEntities);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial load of entities
  useEffect(() => {
    fetchEntities();
  }, []);

  // Fetch entities from API or local data
  const fetchEntities = async () => {
    setIsLoading(true);
    try {
      // In a production app, you'd fetch from your API
      // const response = await fetch(ENTITIES_ENDPOINT);
      // const data = await response.json();

      // For now, load from data.ts
      // Dynamic import to avoid SSR issues
      const { entities } = await import('@/lib/data');
      setEntities(entities);
    } catch (error) {
      console.error('Failed to fetch entities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load entity data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new entity
  const addEntity = async (entityData: Omit<Entity, 'createdAt' | 'updatedAt'>): Promise<Entity> => {
    try {
      // Validate the entity
      if (!entityData.address) {
        throw new Error('Entity address is required');
      }

      // Check if entity already exists
      if (entities.some(e => e.address === entityData.address)) {
        throw new Error('An entity with this address already exists');
      }

      // In a production app, you'd POST to your API
      // const response = await fetch(ENTITIES_ENDPOINT, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entityData)
      // });
      // const newEntity = await response.json();

      // For now, create locally
      const newEntity: Entity = {
        ...entityData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setEntities(prev => [...prev, newEntity]);
      
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
      // Find the entity
      const entityIndex = entities.findIndex(e => e.address === address);
      if (entityIndex === -1) {
        throw new Error('Entity not found');
      }

      // In a production app, you'd PUT to your API
      // const response = await fetch(`${ENTITIES_ENDPOINT}/${address}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updates)
      // });
      // const updatedEntity = await response.json();

      // For now, update locally
      const updatedEntity: Entity = {
        ...entities[entityIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const newEntities = [...entities];
      newEntities[entityIndex] = updatedEntity;
      setEntities(newEntities);

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
      // Find the entity
      const entityIndex = entities.findIndex(e => e.address === address);
      if (entityIndex === -1) {
        throw new Error('Entity not found');
      }

      // In a production app, you'd DELETE to your API
      // await fetch(`${ENTITIES_ENDPOINT}/${address}`, {
      //   method: 'DELETE'
      // });

      // For now, delete locally
      const entityName = entities[entityIndex].name || address;
      setEntities(prev => prev.filter(e => e.address !== address));

      toast({
        title: 'Entity Deleted',
        description: `Successfully deleted ${entityName}`
      });
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
      // Find the entity
      const entityIndex = entities.findIndex(e => e.address === address);
      if (entityIndex === -1) {
        throw new Error('Entity not found');
      }

      const entity = entities[entityIndex];
      
      // Check if address is already related
      if (entity.relatedAddresses.includes(relatedAddress)) {
        throw new Error('Address is already related to this entity');
      }

      // In a production app, you'd make an API call
      // const response = await fetch(`${ENTITIES_ENDPOINT}/${address}/related/${relatedAddress}`, {
      //   method: 'POST'
      // });
      // const updatedEntity = await response.json();

      // For now, update locally
      const updatedEntity: Entity = {
        ...entity,
        relatedAddresses: [...entity.relatedAddresses, relatedAddress],
        updatedAt: new Date().toISOString()
      };

      const newEntities = [...entities];
      newEntities[entityIndex] = updatedEntity;
      setEntities(newEntities);

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
      // Find the entity
      const entityIndex = entities.findIndex(e => e.address === address);
      if (entityIndex === -1) {
        throw new Error('Entity not found');
      }

      const entity = entities[entityIndex];
      
      // Check if address is not related
      if (!entity.relatedAddresses.includes(relatedAddress)) {
        throw new Error('Address is not related to this entity');
      }

      // In a production app, you'd make an API call
      // const response = await fetch(`${ENTITIES_ENDPOINT}/${address}/related/${relatedAddress}`, {
      //   method: 'DELETE'
      // });
      // const updatedEntity = await response.json();

      // For now, update locally
      const updatedEntity: Entity = {
        ...entity,
        relatedAddresses: entity.relatedAddresses.filter(addr => addr !== relatedAddress),
        updatedAt: new Date().toISOString()
      };

      const newEntities = [...entities];
      newEntities[entityIndex] = updatedEntity;
      setEntities(newEntities);

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

  // Get an entity by address
  const getEntityByAddress = (address: string): Entity | undefined => {
    // First try direct match
    let entity = entities.find(e => e.address === address);
    
    // If not found, check related addresses
    if (!entity) {
      entity = entities.find(e => e.relatedAddresses.includes(address));
    }
    
    return entity;
  };

  // Search entities by name or address
  const searchEntities = (query: string, filterType?: string): Entity[] => {
    const normalizedQuery = query.toLowerCase();
    
    return entities.filter(entity => {
      // Apply type filter if specified
      if (filterType && entity.type !== filterType) {
        return false;
      }
      
      // Search by name or address
      return (
        (entity.name && entity.name.toLowerCase().includes(normalizedQuery)) ||
        entity.address.toLowerCase().includes(normalizedQuery) ||
        entity.relatedAddresses.some(addr => addr.toLowerCase().includes(normalizedQuery))
      );
    });
  };

  // Force refresh entities
  const refreshEntities = async (): Promise<void> => {
    await fetchEntities();
  };

  // Context value
  const value: EntityContextType = {
    entities,
    isLoading,
    addEntity,
    updateEntity,
    deleteEntity,
    verifyEntity,
    addRelatedAddress,
    removeRelatedAddress,
    getEntityByAddress,
    searchEntities,
    refreshEntities
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