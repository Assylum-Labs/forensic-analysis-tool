// src/lib/transactionClustering.ts
import { VersionedTransactionResponse } from "@solana/web3.js";

export interface TransactionCluster {
  id: string;
  transactions: string[]; // Transaction signatures
  accounts: string[]; // Involved accounts
  programs: string[]; // Program IDs
  totalValue: number;
  timestamp: number;
  type?: string; // Identified pattern type
  risk?: {
    score: number;
    reasons: string[];
  };
}

export interface ClusteringResult {
  clusters: TransactionCluster[];
  flaggedClusters: TransactionCluster[];
}

// Constants for unusual behavior detection
const LARGE_VALUE_THRESHOLD = 1000; // SOL
const TRANSACTION_BURST_THRESHOLD = 20; // Number of transactions in a short time
const TIME_WINDOW_SECONDS = 300; // 5 minutes

// Known program IDs
const KNOWN_PROGRAMS = {
  SYSTEM_PROGRAM: '11111111111111111111111111111111',
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  ASSOCIATED_TOKEN_PROGRAM: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  JUPITER_PROGRAM: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  RAYDIUM_SWAP: 'SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8',
  MARINADE_FINANCE: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
  SERUM_MARKET: 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
  MAGIC_EDEN: 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K',
  METADATA_PROGRAM: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
};

// Suspicious program patterns to watch for
const SUSPICIOUS_PATTERNS = [
  'Lawr', // Example pattern for a mixer-like service
  'Torn', // Example pattern for a privacy-oriented service
  'Mix',  // Example pattern
  'Wash', // Example pattern
];

// Main clustering function
export async function clusterTransactions(transactions: VersionedTransactionResponse[]): Promise<ClusteringResult> {
  const graph = new Map<string, Set<string>>(); // Account to connected accounts
  const transactionMap = new Map<string, Set<string>>(); // Transaction to involved accounts
  const accountToTransactions = new Map<string, Set<string>>(); // Account to transactions
  const transactionById = new Map<string, VersionedTransactionResponse>(); // For quick lookup

  // Extract accounts and build the graph
  for (const tx of transactions) {
    // Ensure we have a valid transaction
    if (!tx || !tx.transaction || !tx.meta) continue;
    
    const signature = tx.transaction.signatures[0];
    if (!signature) continue;

    // Store for quick lookup
    transactionById.set(signature, tx);

    // Get all accounts involved in the transaction
    const involvedAccounts = extractInvolvedAccounts(tx);
    addTransactionToGraph(graph, transactionMap, accountToTransactions, signature, involvedAccounts);
  }

  // Find connected components (clusters)
  const clusters = findConnectedComponents(graph, transactionMap, accountToTransactions);

  // Analyze clusters for metadata and flag unusual behavior
  const analyzedClusters = await Promise.all(
    clusters.map(cluster => analyzeClusterMetadata(cluster, transactionById))
  );
  
  // Filter out tiny clusters (likely noise)
  const significantClusters = analyzedClusters.filter(
    cluster => cluster.transactions.length >= 2 || cluster.accounts.length >= 3
  );
  
  // Identify suspicious clusters
  const flaggedClusters = significantClusters.filter(cluster => isUnusualBehavior(cluster));

  return {
    clusters: significantClusters,
    flaggedClusters
  };
}

// Extract all accounts involved in a transaction
function extractInvolvedAccounts(tx: VersionedTransactionResponse): string[] {
  const accounts = new Set<string>();
  
  // Extract from message account keys
  const accountKeys = tx.transaction.message.accountKeys || 
                      tx.transaction.message.staticAccountKeys || [];
                      
  accountKeys.forEach(account => {
    accounts.add(account.toString());
  });
  
  // Extract from token balances for token transfers
  if (tx.meta?.preTokenBalances) {
    tx.meta.preTokenBalances.forEach(balance => {
      if (balance.owner) accounts.add(balance.owner);
      if (balance.mint) accounts.add(balance.mint);
    });
  }
  
  if (tx.meta?.postTokenBalances) {
    tx.meta.postTokenBalances.forEach(balance => {
      if (balance.owner) accounts.add(balance.owner);
      if (balance.mint) accounts.add(balance.mint);
    });
  }
  
  return Array.from(accounts);
}

// Add a transaction and its accounts to the graph
function addTransactionToGraph(
  graph: Map<string, Set<string>>,
  transactionMap: Map<string, Set<string>>,
  accountToTransactions: Map<string, Set<string>>,
  signature: string,
  accounts: string[]
) {
  // Store transaction to accounts mapping
  const accountSet = new Set(accounts);
  transactionMap.set(signature, accountSet);
  
  // Update account to transactions mapping
  accounts.forEach(account => {
    if (!accountToTransactions.has(account)) {
      accountToTransactions.set(account, new Set());
    }
    accountToTransactions.get(account)!.add(signature);
    
    // Initialize account node in graph if not exists
    if (!graph.has(account)) {
      graph.set(account, new Set());
    }
  });
  
  // Connect accounts that appear in the same transaction
  for (let i = 0; i < accounts.length; i++) {
    for (let j = i + 1; j < accounts.length; j++) {
      const account1 = accounts[i];
      const account2 = accounts[j];
      
      if (!graph.has(account1)) graph.set(account1, new Set());
      if (!graph.has(account2)) graph.set(account2, new Set());
      
      graph.get(account1)!.add(account2);
      graph.get(account2)!.add(account1);
    }
  }
}

// Find connected components in the graph to identify clusters
function findConnectedComponents(
  graph: Map<string, Set<string>>,
  transactionMap: Map<string, Set<string>>,
  accountToTransactions: Map<string, Set<string>>
): TransactionCluster[] {
  const visited = new Set<string>();
  const clusters: TransactionCluster[] = [];
  
  // DFS to find connected components
  function dfs(node: string, component: Set<string>) {
    visited.add(node);
    component.add(node);
    
    // Visit all neighbors
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, component);
      }
    }
  }
  
  // Find all connected components
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      const component = new Set<string>();
      dfs(node, component);
      
      // Get all transactions involving these accounts
      const transactions = new Set<string>();
      component.forEach(account => {
        const txs = accountToTransactions.get(account);
        if (txs) {
          txs.forEach(tx => transactions.add(tx));
        }
      });
      
      // Create a cluster with a unique ID
      clusters.push({
        id: `cluster-${clusters.length + 1}-${Date.now()}`,
        transactions: Array.from(transactions),
        accounts: Array.from(component),
        programs: [], // Will be filled in analyzeClusterMetadata
        totalValue: 0, // Will be filled in analyzeClusterMetadata
        timestamp: Date.now() // Current timestamp as placeholder
      });
    }
  }
  
  return clusters;
}

// Analyze cluster metadata
async function analyzeClusterMetadata(
  cluster: TransactionCluster, 
  transactionById: Map<string, VersionedTransactionResponse>
): Promise<TransactionCluster> {
  let totalValue = 0;
  const programs = new Set<string>();
  let earliestTimestamp = Number.MAX_SAFE_INTEGER;
  
  // Process each transaction in the cluster
  for (const signature of cluster.transactions) {
    const tx = transactionById.get(signature);
    if (!tx) continue;
    
    // Extract transaction value
    totalValue += estimateTransactionValue(tx);
    
    // Extract programs used
    const programIds = extractProgramIds(tx);
    programIds.forEach(program => programs.add(program));
    
    // Track earliest timestamp
    if (tx.blockTime && tx.blockTime < earliestTimestamp) {
      earliestTimestamp = tx.blockTime;
    }
  }
  
  // Update cluster metadata
  cluster.totalValue = totalValue;
  cluster.programs = Array.from(programs);
  cluster.timestamp = earliestTimestamp !== Number.MAX_SAFE_INTEGER ? earliestTimestamp * 1000 : Date.now();
  
  // Try to determine cluster type
  cluster.type = determineClusterType(cluster, transactionById);
  
  return cluster;
}

// Estimate total value moved in a transaction
function estimateTransactionValue(tx: VersionedTransactionResponse): number {
  let value = 0;
  
  // Native SOL transfers
  if (tx.meta && tx.meta.preBalances && tx.meta.postBalances) {
    for (let i = 0; i < tx.meta.preBalances.length; i++) {
      const preBal = tx.meta.preBalances[i] || 0;
      const postBal = tx.meta.postBalances[i] || 0;
      
      // If balance decreased, count as value transfer
      const diff = preBal - postBal;
      if (diff > 0) {
        // Convert lamports to SOL
        value += diff / 1e9;
      }
    }
  }
  
  // Token transfers (simplified estimate)
  if (tx.meta?.preTokenBalances && tx.meta?.postTokenBalances) {
    // Group by mint
    const mintBalanceChanges = new Map<string, number>();
    
    // Track pre-balances
    tx.meta.preTokenBalances.forEach(balance => {
      const amount = parseFloat(balance.uiTokenAmount.uiAmountString) || 0;
      const mint = balance.mint;
      
      if (!mintBalanceChanges.has(mint)) {
        mintBalanceChanges.set(mint, 0);
      }
      mintBalanceChanges.set(mint, mintBalanceChanges.get(mint)! - amount);
    });
    
    // Track post-balances
    tx.meta.postTokenBalances.forEach(balance => {
      const amount = parseFloat(balance.uiTokenAmount.uiAmountString) || 0;
      const mint = balance.mint;
      
      if (!mintBalanceChanges.has(mint)) {
        mintBalanceChanges.set(mint, 0);
      }
      mintBalanceChanges.set(mint, mintBalanceChanges.get(mint)! + amount);
    });
    
    // Sum up absolute changes (simplified approach)
    for (const change of mintBalanceChanges.values()) {
      // Add to value using a simplified conversion approach
      // In a real implementation, you'd look up token prices
      value += Math.abs(change);
    }
  }
  
  return value;
}

// Extract program IDs from a transaction
function extractProgramIds(tx: VersionedTransactionResponse): string[] {
  const programs = new Set<string>();
  
  const accountKeys = tx.transaction.message.accountKeys || 
                      tx.transaction.message.staticAccountKeys || [];
  
  if (tx.transaction?.message?.instructions) {
    tx.transaction.message.instructions.forEach(instruction => {
      if (accountKeys[instruction.programIdIndex]) {
        programs.add(accountKeys[instruction.programIdIndex].toString());
      }
    });
  }
  
  return Array.from(programs);
}

// Determine if a cluster exhibits unusual behavior
function isUnusualBehavior(cluster: TransactionCluster): boolean {
  // Initialize risk assessment
  if (!cluster.risk) {
    cluster.risk = {
      score: 0,
      reasons: []
    };
  }
  
  let isUnusual = false;
  
  // Check for large value movements
  if (cluster.totalValue > LARGE_VALUE_THRESHOLD) {
    isUnusual = true;
    cluster.risk.score += 30;
    cluster.risk.reasons.push(`Large value movement: ${cluster.totalValue.toFixed(2)} SOL`);
  }
  
  // Check for high transaction count
  if (cluster.transactions.length > TRANSACTION_BURST_THRESHOLD) {
    isUnusual = true;
    cluster.risk.score += 25;
    cluster.risk.reasons.push(`High transaction count: ${cluster.transactions.length} transactions`);
  }
  
  // Check for known suspicious programs
  for (const program of cluster.programs) {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (program.includes(pattern)) {
        isUnusual = true;
        cluster.risk.score += 15;
        cluster.risk.reasons.push(`Uses potentially suspicious program: ${program}`);
        break;
      }
    }
  }
  
  // Check for circular patterns (simplified)
  if (hasPotentialCircularPattern(cluster)) {
    isUnusual = true;
    cluster.risk.score += 40;
    cluster.risk.reasons.push("Possible circular fund movement pattern detected");
  }
  
  return isUnusual;
}

// Simplified check for circular patterns by looking at program usage and account structure
function hasPotentialCircularPattern(cluster: TransactionCluster): boolean {
  // Complex cluster with multiple accounts and transactions has potential for circular flow
  if (cluster.accounts.length >= 5 && cluster.transactions.length >= 5) {
    if (cluster.programs.some(p => 
      p.includes("JUP") || // Jupiter DEX
      p.includes("whir") || // Whirlpool/Orca
      p.includes("SwaP") // Raydium swap
    )) {
      return true;
    }
  }
  
  return false;
}

// Determine the type of cluster based on patterns
function determineClusterType(
  cluster: TransactionCluster,
  transactionById: Map<string, VersionedTransactionResponse>
): string {
  // Check program usage to determine likely type
  const programSet = new Set(cluster.programs);
  
  // Check if swap-related programs are involved
  if (
    hasProgram(programSet, KNOWN_PROGRAMS.JUPITER_PROGRAM) || 
    hasProgram(programSet, KNOWN_PROGRAMS.ORCA_WHIRLPOOL) || 
    hasProgram(programSet, KNOWN_PROGRAMS.RAYDIUM_SWAP) ||
    hasProgram(programSet, KNOWN_PROGRAMS.SERUM_MARKET)
  ) {
    return "Swap";
  }
  
  // Check for staking
  if (
    hasProgram(programSet, "Stake11111111111111111111111111111111111111") ||
    hasProgram(programSet, KNOWN_PROGRAMS.MARINADE_FINANCE)
  ) {
    return "Staking";
  }
  
  // Check for NFT marketplace
  if (
    hasProgram(programSet, KNOWN_PROGRAMS.MAGIC_EDEN) || 
    hasProgram(programSet, KNOWN_PROGRAMS.METADATA_PROGRAM)
  ) {
    return "NFT Marketplace";
  }
  
  // Check for multiple transfers
  let transferCount = 0;
  cluster.transactions.forEach(signature => {
    const tx = transactionById.get(signature);
    if (tx && isTransferTransaction(tx)) {
      transferCount++;
    }
  });
  
  if (transferCount >= Math.max(1, cluster.transactions.length * 0.7)) {
    return "Sequential Transfers";
  }
  
  // Check for divergent pattern (one account sending to many)
  if (isDivergentPattern(cluster, transactionById)) {
    return "Fan-out";
  }

  // Check for convergent pattern (many accounts sending to one)
  if (isConvergentPattern(cluster, transactionById)) {
    return "Fan-in";
  }
  
  // Default type
  return "Mixed Activity";
}

// Helper to check if a program set contains a program (with partial match support)
function hasProgram(programSet: Set<string>, programId: string): boolean {
  if (programSet.has(programId)) return true;
  
  // Allow for partial matching on the first few characters
  const firstChars = programId.substring(0, 8);
  for (const program of programSet) {
    if (program.startsWith(firstChars)) return true;
  }
  
  return false;
}

// Check if a transaction is primarily a transfer
function isTransferTransaction(tx: VersionedTransactionResponse): boolean {
  const accountKeys = tx.transaction.message.accountKeys || 
                      tx.transaction.message.staticAccountKeys || [];
                      
  // Check for System Program transfers
  if (tx.transaction?.message?.instructions) {
    for (const instruction of tx.transaction.message.instructions) {
      const programId = accountKeys[instruction.programIdIndex]?.toString();
      if (programId === KNOWN_PROGRAMS.SYSTEM_PROGRAM || 
          programId === KNOWN_PROGRAMS.TOKEN_PROGRAM) {
        return true;
      }
    }
  }
  
  // Check for token transfers
  if (tx.meta?.preTokenBalances?.length > 0 && 
      tx.meta?.postTokenBalances?.length > 0) {
    return true;
  }
  
  return false;
}

// Detect a divergent pattern (fan-out): one account sending to many others
function isDivergentPattern(
  cluster: TransactionCluster,
  transactionById: Map<string, VersionedTransactionResponse>
): boolean {
  // Build a simplified directed graph of fund flows
  const outflows = new Map<string, Set<string>>();
  
  // Analyze each transaction
  for (const signature of cluster.transactions) {
    const tx = transactionById.get(signature);
    if (!tx || !tx.meta) continue;
    
    // Look for balance decreases and increases
    if (tx.meta.preBalances && tx.meta.postBalances) {
      const accountKeys = tx.transaction.message.accountKeys || 
                          tx.transaction.message.staticAccountKeys || [];
      
      // Find senders (balance decreased)
      for (let i = 0; i < tx.meta.preBalances.length; i++) {
        if (i >= accountKeys.length) continue;
        
        const account = accountKeys[i].toString();
        const preBal = tx.meta.preBalances[i] || 0;
        const postBal = tx.meta.postBalances[i] || 0;
        const diff = preBal - postBal;
        
        // If this account sent funds
        if (diff > 0) {
          // Look for receivers
          for (let j = 0; j < tx.meta.preBalances.length; j++) {
            if (j >= accountKeys.length || i === j) continue;
            
            const receiverAccount = accountKeys[j].toString();
            const receiverPreBal = tx.meta.preBalances[j] || 0;
            const receiverPostBal = tx.meta.postBalances[j] || 0;
            const receiverDiff = receiverPostBal - receiverPreBal;
            
            // If this account received funds
            if (receiverDiff > 0) {
              // Record the flow
              if (!outflows.has(account)) {
                outflows.set(account, new Set());
              }
              outflows.get(account)!.add(receiverAccount);
            }
          }
        }
      }
    }
  }
  
  // Look for a dominant sender (account with many outflows)
  for (const [account, recipients] of outflows.entries()) {
    if (recipients.size >= Math.max(3, cluster.accounts.length * 0.3)) {
      return true;
    }
  }
  
  return false;
}

// Detect a convergent pattern (fan-in): many accounts sending to one
function isConvergentPattern(
  cluster: TransactionCluster,
  transactionById: Map<string, VersionedTransactionResponse>
): boolean {
  // Build a simplified directed graph of fund flows
  const inflows = new Map<string, Set<string>>();
  
  // Analyze each transaction (similar to divergent but tracking receivers)
  for (const signature of cluster.transactions) {
    const tx = transactionById.get(signature);
    if (!tx || !tx.meta) continue;
    
    // Look for balance decreases and increases
    if (tx.meta.preBalances && tx.meta.postBalances) {
      const accountKeys = tx.transaction.message.accountKeys || 
                          tx.transaction.message.staticAccountKeys || [];
      
      // Find receivers (balance increased)
      for (let i = 0; i < tx.meta.preBalances.length; i++) {
        if (i >= accountKeys.length) continue;
        
        const account = accountKeys[i].toString();
        const preBal = tx.meta.preBalances[i] || 0;
        const postBal = tx.meta.postBalances[i] || 0;
        const diff = postBal - preBal;
        
        // If this account received funds
        if (diff > 0) {
          // Look for senders
          for (let j = 0; j < tx.meta.preBalances.length; j++) {
            if (j >= accountKeys.length || i === j) continue;
            
            const senderAccount = accountKeys[j].toString();
            const senderPreBal = tx.meta.preBalances[j] || 0;
            const senderPostBal = tx.meta.postBalances[j] || 0;
            const senderDiff = senderPreBal - senderPostBal;
            
            // If this account sent funds
            if (senderDiff > 0) {
              // Record the flow
              if (!inflows.has(account)) {
                inflows.set(account, new Set());
              }
              inflows.get(account)!.add(senderAccount);
            }
          }
        }
      }
    }
  }
  
  // Look for a dominant receiver (account with many inflows)
  for (const [account, senders] of inflows.entries()) {
    if (senders.size >= Math.max(3, cluster.accounts.length * 0.3)) {
      return true;
    }
  }
  
  return false;
}

// Additional Functions for Advanced Analysis

// Identify wallet rings (circular patterns where funds flow in a loop)
export function identifyWalletRings(clusters: TransactionCluster[]): TransactionCluster[] {
  return clusters.filter(cluster => {
    // Simple heuristic: high risk score or explicitly detected circular pattern
    return cluster.risk?.score >= 40 || 
           cluster.risk?.reasons.some(reason => reason.includes("circular"));
  });
}

// Find wallet groups by analyzing transaction patterns
export function findRelatedWallets(
  clusters: TransactionCluster[]
): {groups: string[][], strength: ('High'|'Medium'|'Low')[]} {
  const walletGroups: string[][] = [];
  const groupStrengths: ('High'|'Medium'|'Low')[] = [];
  const walletsProcessed = new Set<string>();
  
  // Build a wallet relationship graph with weighted edges
  const walletGraph = new Map<string, Map<string, number>>();
  
  // Populate the graph
  clusters.forEach(cluster => {
    // For each account in the cluster
    cluster.accounts.forEach(account => {
      if (!walletGraph.has(account)) {
        walletGraph.set(account, new Map());
      }
      
      // Connect to other accounts in the same cluster
      cluster.accounts.forEach(other => {
        if (account !== other) {
          const strength = calculateRelationshipStrength(account, other, cluster);
          const currentMap = walletGraph.get(account)!;
          
          if (currentMap.has(other)) {
            currentMap.set(other, currentMap.get(other)! + strength);
          } else {
            currentMap.set(other, strength);
          }
        }
      });
    });
  });
  
  // Find strongly connected components using a weighted approach
  const STRENGTH_THRESHOLD = 2; // Minimum weight to consider a relationship strong
  
  function dfs(wallet: string, group: string[], threshold: number) {
    if (walletsProcessed.has(wallet)) return;
    
    walletsProcessed.add(wallet);
    group.push(wallet);
    
    // Visit strong neighbors
    walletGraph.get(wallet)?.forEach((weight, neighbor) => {
      if (weight >= threshold && !walletsProcessed.has(neighbor)) {
        dfs(neighbor, group, threshold);
      }
    });
  }
  
  // Find groups with different strength thresholds
  const thresholds = [
    { value: STRENGTH_THRESHOLD * 2, strength: 'High' as const },
    { value: STRENGTH_THRESHOLD, strength: 'Medium' as const },
    { value: STRENGTH_THRESHOLD / 2, strength: 'Low' as const }
  ];
  
  for (const {value: threshold, strength} of thresholds) {
    // Reset processed set for this threshold
    walletsProcessed.clear();
    
    // Find groups at this threshold
    walletGraph.forEach((_, wallet) => {
      if (!walletsProcessed.has(wallet)) {
        const group: string[] = [];
        dfs(wallet, group, threshold);
        
        if (group.length >= 2) { // Only consider groups with at least 2 wallets
          // Check if this group is mostly a subset of a stronger group
          const isSubset = walletGroups.some(existingGroup => 
            group.length <= existingGroup.length &&
            group.every(wallet => existingGroup.includes(wallet))
          );
          
          if (!isSubset) {
            walletGroups.push(group);
            groupStrengths.push(strength);
          }
        }
      }
    });
  }
  
  return {
    groups: walletGroups,
    strength: groupStrengths
  };
}

// Calculate relationship strength between two wallets based on cluster analysis
function calculateRelationshipStrength(wallet1: string, wallet2: string, cluster: TransactionCluster): number {
  // Base strength
  let strength = 1;
  
  // Increase strength based on cluster type
  if (cluster.type === "Sequential Transfers") strength += 1;
  if (cluster.type === "Fan-out" || cluster.type === "Fan-in") strength += 0.5;
  
  // Increase strength for suspicious clusters
  if (cluster.risk && cluster.risk.score >= 30) strength += 1;
  
  // Consider cluster size (smaller clusters with few wallets indicate stronger connections)
  if (cluster.accounts.length <= 5) strength += 1;
  
  return strength;
}