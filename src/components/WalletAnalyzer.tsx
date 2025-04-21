import React, { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useToast } from '@/components/ui/use-toast';
import ForceDirectedGraph from '@/components/ForceDirectedGraph';
import { fetchEntityData, processTransactionData } from '@/lib/api';

interface WalletAnalyzerProps {
  address: string;
  onDataProcessed?: (data: any) => void;
}

export const WalletAnalyzer: React.FC<WalletAnalyzerProps> = ({ 
  address,
  onDataProcessed 
}) => {
  const [graphData, setGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [entities, setEntities] = useState<Map<string, any>>(new Map());
  const { toast } = useToast();

  // Initialize Solana connection
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || '');

  useEffect(() => {
    if (address) {
      analyzeWallet(address);
    }
  }, [address]);

  const analyzeWallet = async (walletAddress: string) => {
    setIsLoading(true);
    try {
      // Step 1: Load known entities if not loaded
      if (entities.size === 0) {
        const entityData = await fetchEntityData();
        console.log('entityData', entityData);
        
        setEntities(new Map(entityData.entities.map(e => [e.address, e])));
      }

      // Step 2: Fetch wallet transactions
      const pubkey = new PublicKey(walletAddress);
      const signatures = await connection.getSignaturesForAddress(pubkey, {
        limit: 5
        // limit: 100
      });

      // Step 3: Get transaction details
      const transactions = await Promise.all(
        signatures.map(sig => connection.getTransaction(sig.signature, {
            "maxSupportedTransactionVersion": 0
        }))
      );

      // Step 4: Process transactions and build graph
      const processedData = await processTransactionData(
        transactions, 
        walletAddress,
        entities
      );

      console.log(processedData);
      

      setGraphData(processedData.graphData);
      
      if (onDataProcessed) {
        onDataProcessed(processedData);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full">
      {isLoading ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing wallet activity...</p>
          </div>
        </div>
      ) : graphData ? (
        <ForceDirectedGraph 
          graphData={graphData}
          onNodeClick={(node) => {
            // Handle node click - could trigger analysis of connected wallet
            console.log('Node clicked:', node);
          }}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">No data to display</p>
        </div>
      )}
    </div>
  );
};

export default WalletAnalyzer;