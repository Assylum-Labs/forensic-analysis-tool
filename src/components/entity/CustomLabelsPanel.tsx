"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useEntities } from '@/contexts/EntityContext';
import { formatAddress } from '@/lib/utils';
import { Plus, Tag, Filter, Eye, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import EntityForm from './EntityForm';

// Custom label types
type LabelCategory = 'Custom' | 'Project' | 'Entity' | 'Watchlist';
type LabelType = 'Whale Account' | 'Team Wallet' | 'Smart Contract' | 'Project Funds' | 'Tracked Address';

interface CustomLabel {
  id: string;
  name: string;
  type: LabelType;
  category: LabelCategory;
  addresses: string[];
  description: string;
  createdAt: string;
  color: string;
}

const CustomLabelsPanel = () => {
  const { entities, addEntity } = useEntities();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Sample custom labels for UI demonstration
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>([
    {
      id: 'label-1',
      name: 'Whale Account',
      type: 'Whale Account',
      category: 'Watchlist',
      addresses: ['whale1abcdef1234567890', 'whale2abcdef1234567890'],
      description: 'Large holder account with significant activity',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      color: 'solana-purple'
    },
    {
      id: 'label-2',
      name: 'Team Wallet',
      type: 'Team Wallet',
      category: 'Project',
      addresses: ['team1abcdef1234567890'],
      description: 'Project team wallet for controlled assets',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      color: 'solana-blue'
    },
    {
      id: 'label-3',
      name: 'Smart Contract 1',
      type: 'Smart Contract',
      category: 'Entity',
      addresses: ['contract1abcdef1234567890', 'contract2abcdef1234567890', 'contract3abcdef1234567890'],
      description: 'Smart contract with automated functions',
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      color: 'solana-green'
    }
  ]);

  const handleCreateLabel = () => {
    setShowCreateForm(true);
  };

  const handleAddToEntityDatabase = (label: CustomLabel) => {
    // For each address in the label, add it to the entity database
    label.addresses.forEach(address => {
      addEntity({
        address,
        name: `${label.name} - ${formatAddress(address, 4)}`,
        type: label.category === 'Project' ? 'project' : 
              label.category === 'Entity' ? 'contract' : 
              'wallet',
        subtype: label.type.toLowerCase().replace(' ', '_'),
        verified: false,
        website: null,
        description: label.description,
        relatedAddresses: [],
        icon: null
      })
      .then(() => {
        toast({
          title: 'Entity Added',
          description: `Address ${formatAddress(address)} has been added to the entity database`
        });
      })
      .catch(error => {
        // Handle error (entity might already exist)
        if (error.message.includes('already exists')) {
          toast({
            title: 'Entity Already Exists',
            description: `Address ${formatAddress(address)} is already in the entity database`,
            variant: 'destructive'
          });
        } else {
          console.error('Error adding entity:', error);
        }
      });
    });
  };

  const handleDeleteLabel = (id: string) => {
    if (confirm('Are you sure you want to delete this label?')) {
      setCustomLabels(prev => prev.filter(label => label.id !== id));
      toast({
        title: 'Label Deleted',
        description: 'The label has been removed'
      });
    }
  };

  const getLabelColorClass = (color: string) => {
    switch (color) {
      case 'solana-purple':
        return 'text-solana-purple';
      case 'solana-blue':
        return 'text-solana-blue';
      case 'solana-green':
        return 'text-solana-green';
      default:
        return 'text-amber-500';
    }
  };

  const getCategoryColorClass = (category: LabelCategory) => {
    switch (category) {
      case 'Custom':
        return 'bg-solana-purple/10 text-solana-purple';
      case 'Project':
        return 'bg-solana-blue/10 text-solana-blue';
      case 'Entity':
        return 'bg-solana-green/10 text-solana-green';
      case 'Watchlist':
        return 'bg-amber-500/10 text-amber-500';
    }
  };

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-medium">Custom Labels</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your own wallet and entity labels
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm" onClick={handleCreateLabel}>
            <Plus className="h-4 w-4 mr-2" />
            New Label
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {customLabels.map(label => (
          <div key={label.id} className="border border-border rounded-md p-4 hover:border-primary/50 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <Tag className={`h-5 w-5 mr-2 ${getLabelColorClass(label.color)}`} />
                <span className="font-medium">
                  {label.name}
                </span>
              </div>
              <div className="flex">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Addresses:</span>
                <span>{label.addresses.length}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(label.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${getCategoryColorClass(label.category)}`}>
                  {label.category}
                </span>
              </div>
            </div>
            
            <div className="mt-3 text-sm">
              {label.description}
            </div>
            
            <div className="mt-3 space-y-2">
              {label.addresses.slice(0, 2).map(address => (
                <div key={address} className="text-xs bg-muted/20 p-1 rounded flex justify-between items-center">
                  <span className="truncate">{formatAddress(address, 8)}</span>
                  <CheckCircle2 className="h-3 w-3 text-green-500 ml-1" />
                </div>
              ))}
              {label.addresses.length > 2 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{label.addresses.length - 2} more addresses
                </div>
              )}
            </div>
            
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1"
                onClick={() => handleAddToEntityDatabase(label)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Entities
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-red-500"
                onClick={() => handleDeleteLabel(label.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        {customLabels.length === 0 && (
          <div className="col-span-3 text-center p-8 text-muted-foreground">
            No custom labels found. Create one to get started.
          </div>
        )}
      </div>

      {showCreateForm && (
        <EntityForm 
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          mode="create"
        />
      )}
    </div>
  );
};

export default CustomLabelsPanel;