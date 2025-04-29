import { Entity } from "@/types";

// Utility function to find entities by address (including related addresses)
export const findEntityByAddress = (address: string, entities: Entity[]): Entity | undefined => {
    // Direct match
    let entity = entities.find(e => e.address === address);
    
    // Check related addresses
    if (!entity) {
      entity = entities.find(e => e.relatedAddresses.includes(address));
    }
    
    return entity;
  };
  
  // Utility function to get entity types for dropdowns
  export const getEntityTypes = (entities: Entity[]): string[] => {
    if(!entities) return []
    const types = new Set(entities.map(e => e.type).filter(Boolean));
    return Array.from(types).sort();
  };
  
  // Utility function to get entity subtypes for a given type
  export const getEntitySubtypes = (type: string, entities: Entity[]): string[] => {
    const subtypes = new Set(
      entities
        .filter(e => e.type === type)
        .map(e => e.subtype)
        .filter(Boolean)
    );
    return Array.from(subtypes).sort();
  };