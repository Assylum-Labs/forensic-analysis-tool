"use client"

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { formatAddress } from '@/lib/utils';
import { 
  ArrowRightLeft,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  Waypoints
} from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { processTransactionFlow } from '@/lib/transactionProcessor';
import TransactionFlowGraph from '@/components/TransactionFlowGraph';
import { entityCache } from '@/lib/EntityCacheService';
import { useRPC } from '@/contexts/RPCContext';

export default function TransactionAnalysisPage() {
  const [signature, setSignature] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionData, setTransactionData] = useState(null);
  const [flowGraphData, setFlowGraphData] = useState(null);
  const [transactionType, setTransactionType] = useState('');
  const [criticalPath, setCriticalPath] = useState([]);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const { rpcEndpoint } = useRPC()
  const { toast } = useToast();

  // Initialize the entity cache on mount
  useEffect(() => {
    // Ensure entity cache is initialized
    entityCache.initialize();
  }, []);

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignature(e.target.value);
  };

  const analyzeTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signature.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid transaction signature",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Connect to Solana and fetch the transaction
      const connection = new Connection(
        rpcEndpoint || process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
      );
      
      const transaction = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      
      if (!transaction) {
        throw new Error("Transaction not found");
      }
      
      setTransactionData(transaction);
      
      // Use cached entities directly from the cache service
      const cachedEntities = entityCache.getAllEntities();
      
      // Process transaction to get fund flows using cached entities
      const { graphData, type, critical } = await processTransactionFlow(transaction, cachedEntities);
      setFlowGraphData(graphData);
      setTransactionType(type);
      setCriticalPath(critical);
      
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${type} transaction`
      });
    } catch (error) {
      console.error("Transaction analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze transaction",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Transaction Analysis</h1>
              <p className="text-sm text-muted-foreground">
                Analyze a single transaction to understand the flow of funds
              </p>
            </div>
          </div>
          
          <form onSubmit={analyzeTransaction} className="mt-4 flex gap-2">
            <Input
              placeholder="Enter transaction signature"
              value={signature}
              onChange={handleSignatureChange}
              className="flex-1"
            />
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze"
              )}
            </Button>
          </form>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          {isProcessing ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Analyzing transaction...</p>
              </div>
            </div>
          ) : flowGraphData ? (
            <Tabs defaultValue="flow" className="w-full h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="flow">Fund Flow</TabsTrigger>
                <TabsTrigger value="details">Transaction Details</TabsTrigger>
                <TabsTrigger value="accounts">Accounts</TabsTrigger>
              </TabsList>
              
              <TabsContent value="flow" className="flex-1 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                  <div className="md:col-span-2 rounded-md border border-border overflow-hidden relative">
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                      <div className="bg-card border border-border rounded-md p-2 text-sm">
                        <span className="text-muted-foreground mr-2">Type:</span>
                        <span className="font-medium">{transactionType}</span>
                      </div>
                      <button 
                        className={`bg-card border border-border rounded-md p-2 text-sm flex items-center ${showCriticalPath ? 'bg-red-500/10 border-red-500/50' : ''}`}
                        onClick={() => setShowCriticalPath(!showCriticalPath)}
                      >
                        <Waypoints className={`h-4 w-4 mr-2 ${showCriticalPath ? 'text-red-500' : 'text-muted-foreground'}`} />
                        Critical Path
                      </button>
                    </div>
                    <div className="h-full">
                      <TransactionFlowGraph 
                        graphData={flowGraphData}
                        criticalPath={showCriticalPath ? criticalPath : []}
                        className="h-full"
                      />
                    </div>
                  </div>
                  
                  <div className="overflow-y-auto">
                    <div className="rounded-md border border-border overflow-hidden">
                      <div className="p-3 border-b border-border bg-muted/30">
                        <h3 className="font-medium flex items-center">
                          <Waypoints className="h-4 w-4 mr-2 text-red-500" />
                          Critical Path
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Essential execution path for the transaction's primary purpose
                        </p>
                      </div>
                      
                      <div className="p-3">
                        {criticalPath.length > 0 ? (
                          <>
                            <div className="mb-3 bg-red-500/5 rounded-md p-2 text-sm">
                              <p>The critical path shows the essential accounts and interactions required for this {transactionType.toLowerCase()} transaction to succeed. These are the accounts that must interact for the transaction's primary purpose to be fulfilled.</p>
                            </div>
                            <div className="space-y-2">
                              {criticalPath.map((node, index) => (
                                <div key={index} className="relative">
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mr-3">
                                      {index + 1}
                                    </div>
                                    <div>
                                      <div className="font-medium">
                                        {node.label || formatAddress(node.id, 8)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {node.type || 'Account'}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {index < criticalPath.length - 1 && (
                                    <div className="absolute left-4 top-8 h-6 w-0.5 bg-red-500/50"></div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-sm">No critical path identified for this transaction.</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 rounded-md border border-border overflow-hidden">
                      <div className="p-3 border-b border-border">
                        <h3 className="font-medium">Transaction Summary</h3>
                      </div>
                      
                      <div className="p-3">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Transaction Type:</span>
                            <span className="font-medium">{transactionType}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Block:</span>
                            <span className="font-medium">{transactionData?.slot}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Fee:</span>
                            <span className="font-medium">{transactionData?.meta?.fee / 1e9} SOL</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Status:</span>
                            <span className={`font-medium ${transactionData?.meta?.err ? 'text-red-500' : 'text-green-500'}`}>
                              {transactionData?.meta?.err ? 'Failed' : 'Success'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Time:</span>
                            <span className="font-medium">
                              {transactionData?.blockTime 
                                ? new Date(transactionData.blockTime * 1000).toLocaleString() 
                                : 'Unknown'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(`https://solscan.io/tx/${signature}`, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Explorer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="flex-1 overflow-auto">
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-medium">Transaction Details</h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Signature</h4>
                        <div className="p-3 bg-muted/20 rounded-md font-mono text-sm break-all">
                          {signature}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Programs Involved</h4>
                        <div className="space-y-2">
                          {flowGraphData?.programs?.map((program, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-muted/20 rounded-md">
                              <div>
                                <div className="font-medium">{program.name || formatAddress(program.id, 8)}</div>
                                <div className="text-xs text-muted-foreground">{program.type || 'Program'}</div>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => window.open(`https://solscan.io/account/${program.id}`, '_blank')}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Instructions</h4>
                        <div className="space-y-2">
                          {transactionData?.transaction?.message?.instructions?.map((instruction, i) => (
                            <div key={i} className="p-3 bg-muted/20 rounded-md">
                              <div className="font-medium">Instruction #{i+1}</div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                Program: {formatAddress(transactionData.transaction.message.accountKeys[instruction.programIdIndex]?.toString() || '', 8)}
                              </div>
                              <div className="mt-2">
                                <span className="text-xs text-muted-foreground">Accounts:</span>
                                <div className="mt-1 space-y-1">
                                  {instruction.accounts.map((accountIdx, idx) => (
                                    <div key={idx} className="text-xs">
                                      Account #{idx}: {formatAddress(transactionData.transaction.message.accountKeys[accountIdx]?.toString() || '', 8)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="accounts" className="flex-1 overflow-auto">
                <div className="rounded-md border border-border">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-medium">Accounts Involved</h3>
                    <div className="relative w-64">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input className="pl-10" placeholder="Search accounts" />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">Account</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Pre Balance</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Post Balance</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Change</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {flowGraphData?.accounts?.map((account, i) => (
                          <tr key={i} className={`hover:bg-muted/50 ${criticalPath.some(node => node.id === account.id) ? 'bg-red-500/5' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium">{account.label || formatAddress(account.id, 8)}</div>
                              {account.owner && (
                                <div className="text-xs text-muted-foreground">
                                  Owner: {formatAddress(account.owner, 6)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${getTypeColorClass(account.type)}`}>
                                {account.type || 'Account'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{formatBalance(account.preBal)}</td>
                            <td className="px-4 py-3 text-sm">{formatBalance(account.postBal)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={account.change > 0 ? 'text-green-500' : account.change < 0 ? 'text-red-500' : ''}>
                                {account.change > 0 ? '+' : ''}{formatBalance(account.change)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant="ghost" onClick={() => window.open(`https://solscan.io/account/${account.id}`, '_blank')}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-border rounded-md">
              <div className="text-center">
                <ArrowRightLeft className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Enter a transaction signature to analyze fund flows</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// Helper function to get CSS class for account type
function getTypeColorClass(type: string): string {
  switch (type?.toLowerCase()) {
    case 'token':
      return 'bg-solana-purple/10 text-solana-purple';
    case 'program':
      return 'bg-solana-blue/10 text-solana-blue';
    case 'system':
      return 'bg-solana-green/10 text-solana-green';
    case 'signer':
      return 'bg-amber-500/10 text-amber-500';
    case 'token program':
      return 'bg-indigo-500/10 text-indigo-500';
    default:
      return 'bg-muted-foreground/10 text-muted-foreground';
  }
}

// Helper function to format balance in SOL
function formatBalance(lamports: number): string {
  if (lamports === undefined || lamports === null) return '0 SOL';
  
  const sol = lamports / 1e9;
  return `${sol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 9 })} SOL`;
}