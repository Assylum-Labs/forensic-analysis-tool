import React, { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useToast } from '@/components/ui/use-toast';
import ForceDirectedGraph from '@/components/ForceDirectedGraph';
import { fetchEntityData, processTransactionData } from '@/lib/api';
import { formatAddress } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Entity } from '@/types';
import { entities } from '@/lib/data';

interface WalletAnalyzerProps {
  address: string;
  viewMode?: 'wallet' | 'token';
  onDataProcessed?: (data: any) => void;
}

export const WalletAnalyzer: React.FC<WalletAnalyzerProps> = ({ 
  address,
  viewMode = 'wallet',
  onDataProcessed 
}) => {
  const [walletGraphData, setWalletGraphData] = useState(null);
  const [tokenGraphData, setTokenGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // const [entities, setEntities] = useState<Entity[]>([]);
  // const [entities, setEntities] = useState<Map<string, any>>(new Map());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
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
      // if (entities.length === 0) {
      //   const entityData = await fetchEntityData();
        
      //   if (entityData && entityData.entities) {
      //     setEntities((entityData.entities.map(e => [e.address, e])));
      //   }
      // }

      // Step 2: Fetch wallet transactions
      const pubkey = new PublicKey(walletAddress);
      const signatures = await connection.getSignaturesForAddress(pubkey, {
        limit: 100 // Limited for cleaner visualization
      });

      // Step 3: Get transaction details
      const transactions = await Promise.all(
        signatures.map(sig => connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        }))
      );

      // Step 4: Process transactions and build graph (wallet view)
      const processedData = await processTransactionData(
        transactions.filter(tx => tx !== null), 
        walletAddress,
        entities,
        'wallet'
      );

      setWalletGraphData(processedData.graphData);
      
      // Step 5: Process for token view if needed
      const tokenProcessedData = await processTransactionData(
        transactions.filter(tx => tx !== null), 
        walletAddress,
        entities,
        'token'
      );
      
      setTokenGraphData(tokenProcessedData.graphData);
      setTokenData(tokenProcessedData.tokenData);
      
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
    
    // Show information about the node
    if (node.id !== selectedNode) {
      const nodeInfo = viewMode === 'token' && node.tokenMint ? 
        `Token: ${node.label || node.tokenSymbol}` :
        (node.label || formatAddress(node.id, 8));
      
      const typeInfo = viewMode === 'token' ? 
        (node.tokenType ? `Type: ${node.tokenType.toUpperCase()}` : '') :
        (node.type ? `Type: ${node.type.toUpperCase()}` : '');
        
      toast({
        title: nodeInfo,
        description: `${typeInfo} ${node.verified ? '• Verified Entity' : ''}`,
        duration: 3000
      });
    }
  };

  const currentGraphData = viewMode === 'wallet' ? walletGraphData : tokenGraphData;

  return (
    <div className="h-full">
      {isLoading ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Analyzing wallet activity...</p>
          </div>
        </div>
      ) : currentGraphData ? (
        <ForceDirectedGraph 
          graphData={currentGraphData}
          onNodeClick={handleNodeClick}
          highlightedNode={selectedNode}
          viewMode={viewMode}
          tokenData={tokenData}
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