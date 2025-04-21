import React, { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useToast } from '@/components/ui/use-toast';
import ForceDirectedGraph from '@/components/ForceDirectedGraph';
import { fetchEntityData, processTransactionData } from '@/lib/api';
import { formatAddress } from '@/lib/utils';

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
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize Solana connection
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
  );

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
        
        if (entityData && entityData.entities) {
          setEntities(new Map(entityData.entities.map(e => [e.address, e])));
        }
      }

      // Step 2: Fetch wallet transactions
      const pubkey = new PublicKey(walletAddress);
      const signatures = await connection.getSignaturesForAddress(pubkey, {
        limit: 25 // Reduced from 100 to get a cleaner visualization
      });

      // Step 3: Get transaction details
      const transactions = await Promise.all(
        signatures.map(sig => connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        }))
      );

      // Step 4: Process transactions and build graph
      const processedData = await processTransactionData(
        transactions.filter(tx => tx !== null), 
        walletAddress,
        entities
      );

      setGraphData(processedData.graphData);
      
      if (onDataProcessed) {
        onDataProcessed(processedData);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to analyze wallet",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick = (node) => {
    if (!node) {
      setSelectedNode(null);
      return;
    }
    
    setSelectedNode(node.id === selectedNode ? null : node.id);
    
    // Show a toast with node information when clicked
    if (node.id !== selectedNode) {
      toast({
        title: node.label || formatAddress(node.id, 8),
        description: `${node.type ? `Type: ${node.type.toUpperCase()}` : ''} ${node.verified ? '• Verified Entity' : ''}`,
        duration: 3000
      });
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
          onNodeClick={handleNodeClick}
          highlightedNode={selectedNode}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">No data to display. Enter a valid Solana wallet address.</p>
        </div>
      )}
    </div>
  );
};

export default WalletAnalyzer;