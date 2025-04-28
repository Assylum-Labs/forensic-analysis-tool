"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRPC } from '@/contexts/RPCContext';
import { 
  Server, 
  X, 
  Check, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';

const RPCInput: React.FC = () => {
  const { rpcEndpoint, setRpcEndpoint, isCustomEndpoint, resetEndpoint } = useRPC();
  const [inputValue, setInputValue] = useState(rpcEndpoint);
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRpcEndpoint(inputValue);
    setOpen(false);
  };

  // Check if the URL is valid
  const isValidUrl = () => {
    try {
      new URL(inputValue);
      return true;
    } catch (error) {
      return false;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant={isCustomEndpoint ? "outline" : "ghost"} 
          size="sm" 
          className={cn(
            "flex items-center gap-2",
            isCustomEndpoint && "border-amber-500 text-amber-500 hover:text-amber-600 hover:border-amber-600"
          )}
        >
          <Server className="h-4 w-4" />
          {isCustomEndpoint ? 'Custom RPC' : 'RPC Endpoint'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Solana RPC Endpoint</h4>
            {isCustomEndpoint && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  resetEndpoint();
                  setInputValue(process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com');
                  setOpen(false);
                }}
                className="h-8 px-2 text-muted-foreground"
              >
                Reset to default
              </Button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter custom RPC URL"
                className={cn(
                  inputValue && !isValidUrl() && "border-red-500 focus-visible:ring-red-500"
                )}
              />
            </div>
            
            {inputValue && !isValidUrl() && (
              <div className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Please enter a valid URL
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Enter your custom RPC endpoint URL to use for all Solana requests.
            </div>
            
            <div className="flex justify-between pt-2">
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={!isValidUrl()}
              >
                <Check className="h-4 w-4 mr-2" />
                Save Endpoint
              </Button>
            </div>
          </form>
          
          <div className="text-xs text-muted-foreground border-t border-border pt-2">
            <span className="font-medium">Current endpoint:</span> 
            <span className="ml-1 font-mono break-all">{rpcEndpoint}</span>
            
            <div className="mt-1 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              <a 
                href="https://docs.solana.com/cluster/rpc-endpoints" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Learn about Solana RPC endpoints
              </a>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RPCInput;