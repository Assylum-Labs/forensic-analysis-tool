import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, TransactionResponse } from '@solana/web3.js';
import { useToast } from '@/components/ui/use-toast';
import ForceDirectedGraph from '@/components/ForceDirectedGraph';
import { fetchEntityData, processTransactionData } from '@/lib/api';
import { formatAddress } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Entity } from '@/types';
import { useEntities } from '@/contexts/EntityContext';
import { entityCache } from '@/lib/EntityCacheService';

interface WalletAnalyzerProps {
  address: string;
  viewMode?: 'wallet' | 'token';
  startDate?: Date;
  endDate?: Date;
  forceRefresh?: boolean;
  onDataProcessed?: (data: any) => void;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export const WalletAnalyzer: React.FC<WalletAnalyzerProps> = ({ 
  address,
  viewMode = 'wallet',
  startDate: propStartDate,
  endDate: propEndDate,
  forceRefresh = false,
  onDataProcessed,
  isLoading: controlledIsLoading,
  setIsLoading: setControlledIsLoading
}) => {
  const [walletGraphData, setWalletGraphData] = useState(null);
  const [tokenGraphData, setTokenGraphData] = useState(null);
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [lastAnalyzedParams, setLastAnalyzedParams] = useState({
    address: '',
    startDate: null as Date | null,
    endDate: null as Date | null
  });
  const { toast } = useToast();

  // Use controlled or internal loading state
  const isLoading = controlledIsLoading !== undefined ? controlledIsLoading : internalIsLoading;
  const setIsLoading = setControlledIsLoading || setInternalIsLoading;

  // Initialize Solana connection
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
  );
  
  // Ensure cache is initialized
  useEffect(() => {
    entityCache.initialize();
  }, []);

  useEffect(() => {
    // Set default dates if not provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    const startDate = propStartDate || defaultStartDate;
    const endDate = propEndDate || now;
    
    const shouldRefresh = 
      address && 
      (forceRefresh || 
       address !== lastAnalyzedParams.address ||
       !areDatesEqual(startDate, lastAnalyzedParams.startDate) ||
       !areDatesEqual(endDate, lastAnalyzedParams.endDate));
    
    if (shouldRefresh) {
      analyzeWallet(address, startDate, endDate);
    }
  }, [address, propStartDate, propEndDate, forceRefresh]);

  // Helper to compare dates (only comparing year, month, day)
  const areDatesEqual = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  async function fetchTransactionsWithinDateRange(
    pubkey: PublicKey,
    startDate: Date,
    endDate?: Date
  ): Promise<TransactionResponse[]> {
    const allValidSignatures: string[] = [];
    let before: string | undefined = undefined;
  
    const startEpoch = Math.floor(startDate.getTime() / 1000);
    const endEpoch = endDate ? Math.floor(endDate.getTime() / 1000) : undefined;
  
    while (true) {
      const signatures = await connection.getSignaturesForAddress(pubkey, {
        limit: 1000,
        before,
      });
  
      if (signatures.length === 0) break;
  
      for (const sig of signatures) {
        const blockTime = sig.blockTime;
  
        if (!blockTime) continue;
  
        // Stop if we are past the start date
        if (blockTime < startEpoch) {
          return await batchFetchTransactions(allValidSignatures);
        }
  
        // Filter by time range
        if ((!endEpoch || blockTime <= endEpoch) && blockTime >= startEpoch) {
          allValidSignatures.push(sig.signature);
        }
      }
  
      // If we have processed enough signatures, stop to avoid rate limits
      if (allValidSignatures.length > 500) {
        toast({
          title: "Large Dataset",
          description: "Analyzing the first 500 transactions for performance reasons",
          duration: 5000
        });
        break;
      }
  
      before = signatures[signatures.length - 1].signature;
    }
  
    return await batchFetchTransactions(allValidSignatures.slice(0, 500));
  }
  
  async function batchFetchTransactions(signatures: string[]): Promise<TransactionResponse[]> {
    const batchSize = 50;
    const transactions: TransactionResponse[] = [];
  
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const txs = await connection.getTransactions(batch, {
        maxSupportedTransactionVersion: 0,
      });
  
      transactions.push(...(txs.filter(Boolean) as TransactionResponse[]));
    }
  
    return transactions;
  }
  

  const analyzeWallet = async (
    walletAddress: string, 
    startDate: Date, 
    endDate: Date
  ) => {
    setIsLoading(true);
    try {
      // Save the current analysis parameters
      setLastAnalyzedParams({
        address: walletAddress,
        startDate,
        endDate
      });

      // Step 2: Fetch wallet transactions
      const pubkey = new PublicKey(walletAddress);
      
      // Show toast notification about the date range
      toast({
        title: "Analyzing Transactions",
        description: `Fetching transactions from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        duration: 3000
      });

      // Step 3: Get transaction details
      const transactions = await fetchTransactionsWithinDateRange(pubkey, startDate, endDate);

      // If no transactions found, show notification
      if (transactions.length === 0) {
        toast({
          title: "No Transactions Found",
          description: `No transactions found in the selected date range for this wallet`,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Get entities from cache for processing
      const cachedEntities = entityCache.getAllEntities();
      
      // Step 4: Process transactions and build graph (wallet view)
      const processedData = await processTransactionData(
        transactions.filter(tx => tx !== null), 
        walletAddress,
        cachedEntities, // Use cached entities instead of context entities
        'wallet'
      );

      setWalletGraphData(processedData.graphData);
      
      // Step 5: Process for token view if needed
      const tokenProcessedData = await processTransactionData(
        transactions.filter(tx => tx !== null), 
        walletAddress,
        cachedEntities, // Use cached entities
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
    <div className="h-full flex flex-col">
      {isLoading ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Analyzing wallet activity...</p>
          </div>
        </div>
      ) : currentGraphData ? (
        <div className="flex-1 h-[calc(100vh-380px)]"> {/* Increased height of the graph */}
          <ForceDirectedGraph 
            graphData={currentGraphData}
            onNodeClick={handleNodeClick}
            highlightedNode={selectedNode}
            viewMode={viewMode}
            tokenData={tokenData}
            className="h-full w-full"
          />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">No data to display. Enter a valid Solana wallet address and select a date range.</p>
        </div>
      )}
    </div>
  );
};

export default WalletAnalyzer;