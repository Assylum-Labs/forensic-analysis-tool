"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface RPCContextType {
  rpcEndpoint: string;
  setRpcEndpoint: (endpoint: string) => void;
  isCustomEndpoint: boolean;
  resetEndpoint: () => void;
}

const RPCContext = createContext<RPCContextType | undefined>(undefined);

export const RPCProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to environment variable or fallback to Solana mainnet
  const defaultEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
  
  const [rpcEndpoint, setRpcEndpointState] = useState<string>(defaultEndpoint);
  const [isCustomEndpoint, setIsCustomEndpoint] = useState<boolean>(false);
  const { toast } = useToast();

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEndpoint = localStorage.getItem('solanaRpcEndpoint');
      if (savedEndpoint) {
        setRpcEndpointState(savedEndpoint);
        setIsCustomEndpoint(true);
      }
    }
  }, []);

  // Update endpoint and save to localStorage
  const setRpcEndpoint = (endpoint: string) => {
    // Validate the endpoint URL
    if (!endpoint) {
      resetEndpoint();
      return;
    }

    try {
      // Basic URL validation
      new URL(endpoint);
      setRpcEndpointState(endpoint);
      setIsCustomEndpoint(true);
      localStorage.setItem('solanaRpcEndpoint', endpoint);
      
      toast({
        title: "RPC Endpoint Updated",
        description: "All requests will now use the new endpoint"
      });
    } catch (error) {
      toast({
        title: "Invalid RPC URL",
        description: "Please enter a valid URL for the RPC endpoint",
        variant: "destructive"
      });
    }
  };

  // Reset to default endpoint
  const resetEndpoint = () => {
    setRpcEndpointState(defaultEndpoint);
    setIsCustomEndpoint(false);
    localStorage.removeItem('solanaRpcEndpoint');
    
    toast({
      title: "Default RPC Restored",
      description: "Using the default Solana RPC endpoint"
    });
  };

  return (
    <RPCContext.Provider value={{ 
      rpcEndpoint, 
      setRpcEndpoint,
      isCustomEndpoint,
      resetEndpoint
    }}>
      {children}
    </RPCContext.Provider>
  );
};

// Custom hook to use the RPC context
export const useRPC = (): RPCContextType => {
  const context = useContext(RPCContext);
  if (!context) {
    throw new Error('useRPC must be used within an RPCProvider');
  }
  return context;
};

// For non-React components to access the current RPC endpoint
export const getRPCEndpoint = (): string => {
  if (typeof window !== 'undefined') {
    const savedEndpoint = localStorage.getItem('solanaRpcEndpoint');
    if (savedEndpoint) return savedEndpoint;
  }
  
  return process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
};