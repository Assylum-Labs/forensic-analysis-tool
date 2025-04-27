"use client"

import React, { useState } from 'react';
import { Entity } from '@/types';
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/lib/utils';
import { useEntities } from '@/contexts/EntityContext';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Pencil, 
  Trash2, 
  Plus, 
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import EntityForm from './EntityForm';

interface EntityDetailsProps {
  entity: Entity;
  onClose: () => void;
}

const EntityDetails: React.FC<EntityDetailsProps> = ({ entity, onClose }) => {
  const { verifyEntity, deleteEntity, addRelatedAddress, removeRelatedAddress } = useEntities();
  const { toast } = useToast();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newRelatedAddress, setNewRelatedAddress] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: 'Address Copied',
      description: 'The address has been copied to your clipboard.'
    });
  };

  const handleVerifyToggle = async () => {
    setIsVerifying(true);
    try {
      await verifyEntity(entity.address, !entity.verified);
      toast({
        title: entity.verified ? 'Entity Unverified' : 'Entity Verified',
        description: `${entity.name} has been ${entity.verified ? 'unverified' : 'verified'}.`
      });
    } catch (error) {
      console.error('Error toggling verification:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEntity(entity.address);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error deleting entity:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddRelatedAddress = async () => {
    if (!newRelatedAddress || newRelatedAddress.length < 32) return;
    
    setIsAddingAddress(true);
    try {
      await addRelatedAddress(entity.address, newRelatedAddress);
      setNewRelatedAddress('');
    } catch (error) {
      console.error('Error adding related address:', error);
    } finally {
      setIsAddingAddress(false);
    }
  };

  const handleRemoveRelatedAddress = async (address: string) => {
    try {
      await removeRelatedAddress(entity.address, address);
    } catch (error) {
      console.error('Error removing related address:', error);
    }
  };

  const handleOpenExplorer = (address: string) => {
    window.open(`https://solscan.io/account/${address}`, '_blank');
  };

  const getEntityTypeIcon = () => {
    switch (entity.type) {
      case 'exchange':
        return <Shield className="h-5 w-5 text-solana-blue" />;
      case 'token':
        return <ShieldCheck className="h-5 w-5 text-solana-green" />;
      case 'defi_protocol':
        return <ShieldAlert className="h-5 w-5 text-solana-purple" />;
      default:
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getEntityTypeIcon()}
              {entity.name}
              {entity.verified && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </DialogTitle>
            <DialogDescription>
              {entity.type && entity.subtype
                ? `${entity.type.replace('_', ' ')} • ${entity.subtype.replace('_', ' ')}`
                : entity.type?.replace('_', ' ') || 'Unknown type'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="flex items-center gap-2">
                <code className="bg-muted p-1 rounded text-sm flex-1 truncate">
                  {entity.address}
                </code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopyAddress(entity.address)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleOpenExplorer(entity.address)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {entity.description && (
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground">Description</div>
                <div className="text-sm">
                  {entity.description}
                </div>
              </div>
            )}

            {entity.website && (
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground">Website</div>
                <a 
                  href={entity.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                >
                  {entity.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">Related Addresses</div>
              {entity.relatedAddresses && entity.relatedAddresses.length > 0 ? (
                <div className="space-y-1">
                  {entity.relatedAddresses.map(address => (
                    <div key={address} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                      <code className="truncate">{formatAddress(address, 10)}</code>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          onClick={() => handleCopyAddress(address)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          onClick={() => handleOpenExplorer(address)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          onClick={() => handleRemoveRelatedAddress(address)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No related addresses</div>
              )}

              <div className="mt-2 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Add related address" 
                  className="flex-1 text-sm px-3 py-2 rounded border border-input"
                  value={newRelatedAddress}
                  onChange={(e) => setNewRelatedAddress(e.target.value)}
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleAddRelatedAddress}
                  disabled={isAddingAddress || !newRelatedAddress || newRelatedAddress.length < 32}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">Metadata</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Added: {new Date(entity.createdAt).toLocaleDateString()}</div>
                <div>Updated: {new Date(entity.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowEditForm(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={entity.verified ? "default" : "outline"} 
                onClick={handleVerifyToggle}
                disabled={isVerifying}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {entity.verified ? 'Verified' : 'Verify'}
              </Button>
              <Button onClick={onClose}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showEditForm && (
        <EntityForm 
          open={showEditForm} 
          onOpenChange={setShowEditForm} 
          entityToEdit={entity} 
          mode="edit" 
        />
      )}

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{entity.name}</p>
            <code className="text-xs bg-muted p-1 rounded mt-1 block">{entity.address}</code>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Entity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EntityDetails;