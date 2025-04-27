"use client"

import React, { useState } from 'react';
import { useEntities } from '@/contexts/EntityContext';
import { formatAddress } from '@/lib/utils';
import { CheckCircle2, ExternalLink, Info } from 'lucide-react';
import { Entity } from '@/types';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import EntityDetails from './EntityDetails';

interface EntityTagProps {
  address: string;
  showAddress?: boolean;
  showTooltip?: boolean;
  clickable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * EntityTag - A reusable component to display entity information across the application
 * 
 * This component looks up an address in the global entity store and displays the
 * entity name with a verification badge if verified. It can be used anywhere in the
 * application to provide consistent entity labeling.
 */
const EntityTag: React.FC<EntityTagProps> = ({ 
  address, 
  showAddress = false,
  showTooltip = true,
  clickable = true,
  size = 'md',
  className = ""
}) => {
  const { getEntityByAddress } = useEntities();
  const [showDetails, setShowDetails] = useState(false);

  // Look up the entity in the global store
  const entity = getEntityByAddress(address);
  
  if (!entity) {
    // If no entity is found, just show the formatted address
    return (
      <span className={`text-muted-foreground ${className}`}>
        {formatAddress(address, size === 'sm' ? 4 : size === 'md' ? 6 : 8)}
      </span>
    );
  }

  // Get entity type color
  const getTypeColor = (type?: string | null) => {
    switch (type) {
      case 'token':
        return 'text-solana-green';
      case 'exchange':
        return 'text-solana-blue';
      case 'nft_marketplace':
        return 'text-solana-purple';
      case 'defi_protocol':
        return 'text-amber-500';
      default:
        return 'text-foreground';
    }
  };

  // Get entity background color
  const getTypeBgColor = (type?: string | null) => {
    switch (type) {
      case 'token':
        return 'bg-solana-green/10';
      case 'exchange':
        return 'bg-solana-blue/10';
      case 'nft_marketplace':
        return 'bg-solana-purple/10';
      case 'defi_protocol':
        return 'bg-amber-500/10';
      default:
        return 'bg-muted/50';
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-1.5',
    md: 'text-sm py-1 px-2',
    lg: 'text-base py-1.5 px-3'
  };

  const handleClick = () => {
    if (clickable) {
      setShowDetails(true);
    }
  };

  // If entity is found, display the entity tag
  return (
    <>
      {showTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span 
                className={`
                  inline-flex items-center rounded 
                  ${sizeClasses[size]} 
                  ${getTypeBgColor(entity.type)} 
                  ${getTypeColor(entity.type)}
                  ${clickable ? 'cursor-pointer hover:opacity-80' : ''}
                  ${className}
                `}
                onClick={handleClick}
              >
                <span className="font-medium">{entity.name || formatAddress(address, 6)}</span>
                {entity.verified && (
                  <CheckCircle2 className={`ml-1 ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-green-500`} />
                )}
                {showAddress && address !== entity.address && (
                  <span className="ml-1 text-muted-foreground">
                    ({formatAddress(address, size === 'sm' ? 3 : 4)})
                  </span>
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 p-1">
                <div className="font-medium">{entity.name}</div>
                <div className="text-xs">{formatAddress(entity.address, 8)}</div>
                {entity.type && (
                  <div className="text-xs text-muted-foreground">
                    Type: {entity.type.replace('_', ' ')}
                    {entity.subtype && ` / ${entity.subtype.replace('_', ' ')}`}
                  </div>
                )}
                {entity.verified && (
                  <div className="text-xs text-green-500 flex items-center">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified Entity
                  </div>
                )}
                {clickable && (
                  <div className="text-xs text-primary">Click for details</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span 
          className={`
            inline-flex items-center rounded 
            ${sizeClasses[size]} 
            ${getTypeBgColor(entity.type)} 
            ${getTypeColor(entity.type)}
            ${clickable ? 'cursor-pointer hover:opacity-80' : ''}
            ${className}
          `}
          onClick={handleClick}
        >
          <span className="font-medium">{entity.name || formatAddress(address, 6)}</span>
          {entity.verified && (
            <CheckCircle2 className={`ml-1 ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-green-500`} />
          )}
          {showAddress && address !== entity.address && (
            <span className="ml-1 text-muted-foreground">
              ({formatAddress(address, size === 'sm' ? 3 : 4)})
            </span>
          )}
        </span>
      )}

      {/* Show entity details dialog when clicked */}
      {showDetails && (
        <EntityDetails 
          entity={entity} 
          onClose={() => setShowDetails(false)} 
        />
      )}
    </>
  );
};

export default EntityTag;