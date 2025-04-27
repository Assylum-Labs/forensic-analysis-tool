"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Entity } from '@/types';
import { useEntities } from '@/contexts/EntityContext';
import { getEntityTypes, getEntitySubtypes } from '@/lib/data';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatAddress } from '@/lib/utils';

interface EntityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityToEdit?: Entity;
  mode: 'create' | 'edit';
}

const EntityForm: React.FC<EntityFormProps> = ({ 
  open, 
  onOpenChange, 
  entityToEdit,
  mode = 'create'
}) => {
  const { addEntity, updateEntity } = useEntities();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Entity>>({
    address: '',
    name: '',
    type: '',
    subtype: '',
    verified: false,
    website: '',
    description: '',
    relatedAddresses: [],
    icon: null
  });
  
  const [relatedAddressInput, setRelatedAddressInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [availableSubtypes, setAvailableSubtypes] = useState<string[]>([]);
  
  // Initialize form data when editing an entity
  useEffect(() => {
    if (mode === 'edit' && entityToEdit) {
      setFormData({
        ...entityToEdit
      });
      
      // Update available subtypes based on the entity type
      if (entityToEdit.type) {
        setAvailableSubtypes(getEntitySubtypes(entityToEdit.type));
      }
    } else {
      // Reset form for creating a new entity
      setFormData({
        address: '',
        name: '',
        type: '',
        subtype: '',
        verified: false,
        website: '',
        description: '',
        relatedAddresses: [],
        icon: null
      });
      setAvailableSubtypes([]);
    }
  }, [mode, entityToEdit, open]);
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.address) {
      errors.address = 'Address is required';
    } else if (formData.address.length < 32) {
      errors.address = 'Address is too short (must be a valid Solana address)';
    }
    
    if (!formData.name) {
      errors.name = 'Name is required';
    }
    
    if (!formData.type) {
      errors.type = 'Type is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when field is updated
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update available subtypes when type changes
    if (name === 'type') {
      setAvailableSubtypes(getEntitySubtypes(value));
      
      // Reset subtype if type changes
      setFormData(prev => ({
        ...prev,
        subtype: ''
      }));
    }
    
    // Clear validation error when field is updated
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const handleAddRelatedAddress = () => {
    if (!relatedAddressInput || relatedAddressInput.length < 32) return;
    
    // Check if address is already in the list
    if (formData.relatedAddresses?.includes(relatedAddressInput)) return;
    
    setFormData(prev => ({
      ...prev,
      relatedAddresses: [...(prev.relatedAddresses || []), relatedAddressInput]
    }));
    
    setRelatedAddressInput('');
  };
  
  const handleRemoveRelatedAddress = (address: string) => {
    setFormData(prev => ({
      ...prev,
      relatedAddresses: (prev.relatedAddresses || []).filter(addr => addr !== address)
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (mode === 'create') {
        await addEntity(formData as Omit<Entity, 'createdAt' | 'updatedAt'>);
      } else if (mode === 'edit' && entityToEdit) {
        await updateEntity(entityToEdit.address, formData);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save entity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const entityTypes = getEntityTypes();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Entity' : 'Edit Entity'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Enter the details for the new entity. Entities help identify and label addresses in the Solana ecosystem.'
              : 'Update the entity details. Changes will be reflected throughout the application.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address">
                Address 
                <span className="text-red-500 ml-1">*</span>
                {mode === 'edit' && <span className="text-muted-foreground text-xs ml-2">(Cannot be changed)</span>}
              </Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                disabled={mode === 'edit'}
                placeholder="Solana address (base58)"
                className={validationErrors.address ? 'border-red-500' : ''}
              />
              {validationErrors.address && (
                <p className="text-red-500 text-xs">{validationErrors.address}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">
                Name
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                placeholder="Entity name"
                className={validationErrors.name ? 'border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-red-500 text-xs">{validationErrors.name}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">
                Type
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                value={formData.type || ''}
                onValueChange={(value) => handleSelectChange('type', value)}
              >
                <SelectTrigger className={validationErrors.type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                  <SelectItem value="exchange">EXCHANGE</SelectItem>
                  <SelectItem value="nft_marketplace">NFT MARKETPLACE</SelectItem>
                  <SelectItem value="defi_protocol">DEFI PROTOCOL</SelectItem>
                  <SelectItem value="token">TOKEN</SelectItem>
                  <SelectItem value="project">PROJECT</SelectItem>
                  <SelectItem value="foundation">FOUNDATION</SelectItem>
                  <SelectItem value="wallet">WALLET</SelectItem>
                  <SelectItem value="contract">CONTRACT</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.type && (
                <p className="text-red-500 text-xs">{validationErrors.type}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subtype">Subtype</Label>
              <Select
                value={formData.subtype || ''}
                onValueChange={(value) => handleSelectChange('subtype', value)}
                disabled={!formData.type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subtype (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubtypes.map((subtype) => (
                    <SelectItem key={subtype} value={subtype}>
                      {subtype.replace('_', ' ')}
                    </SelectItem>
                  ))}
                  {formData.type === 'exchange' && (
                    <>
                      <SelectItem value="cex">CEX</SelectItem>
                      <SelectItem value="dex">DEX</SelectItem>
                    </>
                  )}
                  {formData.type === 'token' && (
                    <>
                      <SelectItem value="stablecoin">Stablecoin</SelectItem>
                      <SelectItem value="wrapped">Wrapped Token</SelectItem>
                      <SelectItem value="liquid_staking">Liquid Staking</SelectItem>
                      <SelectItem value="governance">Governance Token</SelectItem>
                    </>
                  )}
                  {formData.type === 'defi_protocol' && (
                    <>
                      <SelectItem value="lending">Lending</SelectItem>
                      <SelectItem value="staking">Staking</SelectItem>
                      <SelectItem value="yield_aggregator">Yield Aggregator</SelectItem>
                      <SelectItem value="liquidity_provider">Liquidity Provider</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              value={formData.website || ''}
              onChange={handleInputChange}
              placeholder="https://example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              placeholder="Brief description of this entity"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={formData.verified}
                onCheckedChange={(checked) => 
                  handleCheckboxChange('verified', checked as boolean)
                }
              />
              <Label htmlFor="verified">
                Verified Entity
              </Label>
            </div>
            <p className="text-muted-foreground text-xs">
              Verified entities are displayed with a checkmark and considered reliable in analysis
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Related Addresses</Label>
            <div className="flex space-x-2">
              <Input
                value={relatedAddressInput}
                onChange={(e) => setRelatedAddressInput(e.target.value)}
                placeholder="Enter a related Solana address"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddRelatedAddress}
                disabled={!relatedAddressInput || relatedAddressInput.length < 32}
              >
                Add
              </Button>
            </div>
            
            {formData.relatedAddresses && formData.relatedAddresses.length > 0 ? (
              <div className="mt-2 space-y-2">
                {formData.relatedAddresses.map((address) => (
                  <div key={address} className="flex justify-between items-center p-2 rounded-md bg-muted text-sm">
                    <span className="truncate flex-1">{formatAddress(address, 8)}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveRelatedAddress(address)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs mt-2">
                No related addresses added yet
              </p>
            )}
          </div>
        </form>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? 'Saving...' 
              : mode === 'create' ? 'Create Entity' : 'Update Entity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EntityForm;