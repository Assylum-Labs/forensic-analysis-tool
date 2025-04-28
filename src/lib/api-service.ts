// src/lib/api-service.ts
import { Entity } from '@/types';

// API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4600';
const ENTITIES_ENDPOINT = `${API_BASE}/entities`;

// Entity filters interface
export interface EntityFilters {
  type?: string;
  verified?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// Pagination result interface
export interface PaginatedResult<T> {
  entities: T[];
  total: number;
}

// API error class
export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * Handles API request with error handling
 */
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Check if the request was successful
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: 'Unknown error occurred' };
      }

      throw new ApiError(
        errorData.message || `API error: ${response.status}`,
        response.status,
        errorData
      );
    }

    // For DELETE requests that return 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    // Parse the response body
    return await response.json();
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || 'Network error',
      0
    );
  }
}

/**
 * Entity API Service
 */
export const EntityService = {
  /**
   * Fetch entities with pagination and filtering
   */
  async getEntities(filters: EntityFilters = {}): Promise<PaginatedResult<Entity>> {
    const queryParams = new URLSearchParams();
    
    if (filters.limit !== undefined) queryParams.append('limit', filters.limit.toString());
    if (filters.offset !== undefined) queryParams.append('offset', filters.offset.toString());
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.verified !== undefined) queryParams.append('verified', filters.verified.toString());
    if (filters.search) queryParams.append('search', filters.search);
    
    const url = `${ENTITIES_ENDPOINT}?${queryParams.toString()}`;
    return apiRequest<PaginatedResult<Entity>>(url);
  },

  /**
   * Get entity by address
   */
  async getEntity(address: string): Promise<Entity> {
    return apiRequest<Entity>(`${ENTITIES_ENDPOINT}/${address}`);
  },

  /**
   * Create a new entity
   */
  async createEntity(entityData: Omit<Entity, 'createdAt' | 'updatedAt'>): Promise<Entity> {
    return apiRequest<Entity>(ENTITIES_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(entityData),
    });
  },

  /**
   * Update an existing entity
   */
  async updateEntity(address: string, updates: Partial<Entity>): Promise<Entity> {
    return apiRequest<Entity>(`${ENTITIES_ENDPOINT}/${address}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete an entity
   */
  async deleteEntity(address: string): Promise<void> {
    return apiRequest<void>(`${ENTITIES_ENDPOINT}/${address}`, {
      method: 'DELETE',
    });
  },

  /**
   * Verify an entity
   */
  async verifyEntity(address: string, verified: boolean): Promise<Entity> {
    return this.updateEntity(address, { verified });
  },

  /**
   * Add a related address to an entity
   */
  async addRelatedAddress(address: string, relatedAddress: string): Promise<Entity> {
    return apiRequest<Entity>(`${ENTITIES_ENDPOINT}/${address}/related/${relatedAddress}`, {
      method: 'POST',
    });
  },

  /**
   * Remove a related address from an entity
   */
  async removeRelatedAddress(address: string, relatedAddress: string): Promise<Entity> {
    return apiRequest<Entity>(`${ENTITIES_ENDPOINT}/${address}/related/${relatedAddress}`, {
      method: 'DELETE',
    });
  },

  /**
   * Bulk create entities
   */
  async bulkCreateEntities(entities: Omit<Entity, 'createdAt' | 'updatedAt'>[]): Promise<Entity[]> {
    return apiRequest<Entity[]>(`${ENTITIES_ENDPOINT}/bulk`, {
      method: 'POST',
      body: JSON.stringify(entities),
    });
  },

  /**
   * Bulk update entities
   */
  async bulkUpdateEntities(updates: { address: string; data: Partial<Entity> }[]): Promise<Entity[]> {
    return apiRequest<Entity[]>(`${ENTITIES_ENDPOINT}/bulk`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Find entities by addresses
   */
  async findByAddresses(addresses: string[]): Promise<Entity[]> {
    return apiRequest<Entity[]>(`${ENTITIES_ENDPOINT}/by-addresses`, {
      method: 'POST',
      body: JSON.stringify(addresses),
    });
  },
};

export default EntityService;