"use client"

import React, { useState, useMemo } from 'react';
import { Entity } from '@/types';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Edit, ExternalLink, Filter, Search, Trash2 } from 'lucide-react';
import { formatAddress } from '@/lib/utils';
import { useEntities } from '@/contexts/EntityContext';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import EntityDetails from './EntityDetails';
import { getEntityTypes } from '@/lib/data';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface EntityListProps {
  onAddEntity?: () => void;
  className?: string;
}

const EntityList: React.FC<EntityListProps> = ({ 
  onAddEntity,
  className = ""
}) => {
  const { entities, deleteEntity, verifyEntity } = useEntities();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  
  const handleDeleteEntity = async (address: string) => {
    if (confirm('Are you sure you want to delete this entity? This action cannot be undone.')) {
      try {
        await deleteEntity(address);
      } catch (error) {
        console.error('Error deleting entity:', error);
      }
    }
  };
  
  const handleVerifyEntity = async (address: string, currentStatus: boolean) => {
    try {
      await verifyEntity(address, !currentStatus);
      
      toast({
        title: currentStatus ? 'Entity Unverified' : 'Entity Verified',
        description: `The entity has been ${currentStatus ? 'unverified' : 'verified'}.`
      });
    } catch (error) {
      console.error('Error toggling verification:', error);
    }
  };
  
  const handleOpenExplorer = (address: string) => {
    window.open(`https://solscan.io/account/${address}`, '_blank');
  };
  
  // Filter and sort entities
  const filteredEntities = useMemo(() => {
    return entities
      .filter(entity => {
        // Apply type filter
        if (selectedType && entity.type !== selectedType) {
          return false;
        }
        
        // Apply verified filter
        if (showVerifiedOnly && !entity.verified) {
          return false;
        }
        
        // Apply search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            (entity.name && entity.name.toLowerCase().includes(query)) ||
            entity.address.toLowerCase().includes(query) ||
            (entity.description && entity.description.toLowerCase().includes(query)) ||
            entity.relatedAddresses.some(addr => addr.toLowerCase().includes(query))
          );
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort verified entities first
        if (a.verified !== b.verified) {
          return a.verified ? -1 : 1;
        }
        
        // Then sort by name
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [entities, searchQuery, selectedType, showVerifiedOnly]);
  
  const entityTypes = getEntityTypes();
  
  const getEntityTypeClass = (type?: string | null) => {
    switch (type) {
      case 'token':
        return 'bg-solana-green/10 text-solana-green';
      case 'exchange':
        return 'bg-solana-blue/10 text-solana-blue';
      case 'nft_marketplace':
        return 'bg-solana-purple/10 text-solana-purple';
      case 'defi_protocol':
        return 'bg-amber-500/10 text-amber-500';
      case 'project':
        return 'bg-red-500/10 text-red-500';
      case 'foundation':
        return 'bg-indigo-500/10 text-indigo-500';
      default:
        return 'bg-muted-foreground/10 text-muted-foreground';
    }
  };
  
  return (
    <div className={`rounded-md border border-border ${className}`}>
      <div className="p-4 border-b border-border flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium">Entity Database</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredEntities.length} entities found
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input 
              className="pl-10" 
              placeholder="Search entities" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
              <div className="space-y-2 p-2">
                <div className="text-sm font-medium">Type</div>
                <Select
                  value={selectedType}
                  onValueChange={setSelectedType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {entityTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center pt-2">
                  <input
                    type="checkbox"
                    id="verified-only"
                    checked={showVerifiedOnly}
                    onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="verified-only" className="text-sm">
                    Verified only
                  </label>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    setSelectedType('');
                    setShowVerifiedOnly(false);
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {onAddEntity && (
            <Button size="sm" onClick={onAddEntity}>
              Add Entity
            </Button>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Entity Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Main Address</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Related Addresses</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Verified</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredEntities.length > 0 ? (
              filteredEntities.map((entity) => (
                <tr 
                  key={entity.address} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedEntity(entity)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-solana-purple to-solana-blue mr-3 flex items-center justify-center text-white font-medium">
                        {entity.name ? entity.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <div className="font-medium">{entity.name || formatAddress(entity.address, 8)}</div>
                        <div className="text-xs text-muted-foreground">
                          Added: {new Date(entity.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {entity.type && (
                      <span className={`px-2 py-1 rounded text-xs ${getEntityTypeClass(entity.type)}`}>
                        {entity.type.replace('_', ' ')}
                      </span>
                    )}
                    {entity.subtype && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {entity.subtype.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatAddress(entity.address, 8)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {entity.relatedAddresses.length} addresses
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center">
                      {entity.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleOpenExplorer(entity.address)}
                        title="View on Explorer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleVerifyEntity(entity.address, entity.verified)}
                        title={entity.verified ? "Unverify" : "Verify"}
                      >
                        <CheckCircle2 className={`h-4 w-4 ${entity.verified ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDeleteEntity(entity.address)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={6}>
                  {searchQuery || selectedType || showVerifiedOnly
                    ? 'No entities match your search criteria'
                    : 'No entities found. Add some to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {selectedEntity && (
        <EntityDetails 
          entity={selectedEntity} 
          onClose={() => setSelectedEntity(null)} 
        />
      )}
    </div>
  );
};

export default EntityList;