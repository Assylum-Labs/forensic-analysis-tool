// src/lib/clusteringService.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { clusterTransactions, TransactionCluster, findRelatedWallets, identifyWalletRings } from './transactionClustering';
import { formatAddress } from './utils';
import { Entity } from '@/types';
import { generateSampleClusters } from './sampleClusterData';

// In-memory cache for clustering results
const clusteringCache = new Map<string, {
  result: {
    clusters: TransactionCluster[],
    flaggedClusters: TransactionCluster[],
    walletGroups: {
      groups: string[][],
      strength: ('High' | 'Medium' | 'Low')[]
    },
    ringClusters: TransactionCluster[]
  },
  timestamp: number,
  searchParams: string
}>();

// Cache expiration time (30 minutes)
const CACHE_EXPIRATION = 30 * 60 * 1000;

// Flag to use sample data for development/demo
const USE_SAMPLE_DATA = true;

// Function to fetch transactions and perform clustering
export async function fetchAndClusterTransactions(
  searchQuery: string,
  options: {
    timeframe?: 'day' | 'week' | 'month' | 'all',
    limit?: number,
    filterType?: string,
    enrichWithEntities?: boolean,
    entities?: Entity[]
  } = {}
) {
  const {
    timeframe = 'week',
    limit = 500,
    filterType,
    enrichWithEntities = true,
    entities = []
  } = options;

  // Create cache key from query and options
  const cacheKey = `${searchQuery}-${timeframe}-${limit}-${filterType || 'all'}`;
  
  // Check if we have cached results that are still valid
  const cachedResult = clusteringCache.get(cacheKey);
  if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_EXPIRATION)) {
    return cachedResult.result;
  }

  try {
    // For demo purposes, use sample data instead of actual API calls
    if (USE_SAMPLE_DATA) {
      // Generate sample clusters using the search query as a seed
      let sampleData = generateSampleClusters(searchQuery);
      
      // Apply type filtering if specified
      if (filterType) {
        sampleData.clusters = sampleData.clusters.filter(cluster => 
          cluster.type?.toLowerCase() === filterType.toLowerCase()
        );
      }
      
      // Cache the result
      clusteringCache.set(cacheKey, {
        result: sampleData,
        timestamp: Date.now(),
        searchParams: cacheKey
      });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return sampleData;
    }

    // Real implementation would use actual blockchain data:
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
    );

    // Determine if the query is a wallet address or a pattern
    let transactions = [];
    let isWallet = false;

    try {
      // Try to parse as a wallet address
      const publicKey = new PublicKey(searchQuery);
      isWallet = true;
      
      // Fetch signatures for the wallet
      const signatures = await fetchSignaturesForTimeframe(connection, publicKey, timeframe, limit);
      
      // Fetch transaction details
      transactions = await fetchTransactionsFromSignatures(connection, signatures);
    } catch (error) {
      // Not a valid address, try as a pattern match
      console.log("Not a valid address, treating as a pattern:", error);
      
      // This would be a more complex API query in a real implementation
      // For now, we'll just return an empty result
      transactions = [];
    }

    // If no transactions found, return empty result
    if (transactions.length === 0) {
      const emptyResult = {
        clusters: [],
        flaggedClusters: [],
        walletGroups: { groups: [], strength: [] },
        ringClusters: []
      };
      
      // Cache the empty result
      clusteringCache.set(cacheKey, {
        result: emptyResult,
        timestamp: Date.now(),
        searchParams: cacheKey
      });
      
      return emptyResult;
    }

    // Perform transaction clustering
    const { clusters, flaggedClusters } = await clusterTransactions(transactions);
    
    // Apply any type filters
    let filteredClusters = clusters;
    if (filterType) {
      filteredClusters = clusters.filter(cluster => 
        cluster.type?.toLowerCase() === filterType.toLowerCase()
      );
    }
    
    // Enrich clusters with entity information
    if (enrichWithEntities && entities.length > 0) {
      enrichClustersWithEntities(filteredClusters, entities);
      enrichClustersWithEntities(flaggedClusters, entities);
    }
    
    // Find related wallet groups
    const walletGroups = findRelatedWallets(filteredClusters);
    
    // Identify wallet rings (circular patterns)
    const ringClusters = identifyWalletRings(filteredClusters);

    // Prepare result
    const result = {
      clusters: filteredClusters,
      flaggedClusters,
      walletGroups,
      ringClusters
    };
    
    // Cache the result
    clusteringCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      searchParams: cacheKey
    });
    
    return result;
  } catch (error) {
    console.error("Error in clustering service:", error);
    throw new Error(`Transaction clustering failed: ${error.message}`);
  }
}

// Helper function to fetch signatures for a given timeframe
async function fetchSignaturesForTimeframe(
  connection: Connection,
  publicKey: PublicKey,
  timeframe: 'day' | 'week' | 'month' | 'all',
  limit: number
): Promise<string[]> {
  // Calculate start time based on timeframe
  const now = new Date();
  let startTime: Date;
  
  switch (timeframe) {
    case 'day':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      break;
    case 'week':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week ago
      break;
    case 'month':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      break;
    case 'all':
    default:
      startTime = new Date(2020, 0, 1); // Beginning of Solana history
      break;
  }
  
  // Convert to Unix timestamp
  const startTimeUnix = Math.floor(startTime.getTime() / 1000);
  
  try {
    const signatures = [];
    let lastSignature: string | undefined = undefined;
    
    // Fetch signatures in batches until we have enough or no more are available
    while (signatures.length < limit) {
      const signatureBatch = await connection.getSignaturesForAddress(
        publicKey,
        { 
          before: lastSignature,
          limit: Math.min(1000, limit - signatures.length)
        }
      );
      
      if (signatureBatch.length === 0) break;
      
      // Filter by time and add to results
      for (const sig of signatureBatch) {
        if (sig.blockTime && sig.blockTime >= startTimeUnix) {
          signatures.push(sig.signature);
        } else if (timeframe !== 'all') {
          // We've gone past our time window, stop fetching more
          break;
        }
      }
      
      // Update last signature for pagination
      lastSignature = signatureBatch[signatureBatch.length - 1].signature;
      
      // If we got fewer than requested, we've reached the end
      if (signatureBatch.length < Math.min(1000, limit - signatures.length)) {
        break;
      }
    }
    
    return signatures;
  } catch (error) {
    console.error("Error fetching signatures:", error);
    return [];
  }
}

// Fetch transaction details from signatures
async function fetchTransactionsFromSignatures(
  connection: Connection,
  signatures: string[]
) {
  if (signatures.length === 0) return [];
  
  try {
    // Fetch transactions in batches to avoid rate limits
    const batchSize = 100;
    const transactions = [];
    
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const txBatch = await connection.getTransactions(batch, {
        maxSupportedTransactionVersion: 0
      });
      
      transactions.push(...txBatch.filter(Boolean));
    }
    
    return transactions;
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    return [];
  }
}

// Enrich clusters with entity information
function enrichClustersWithEntities(
  clusters: TransactionCluster[],
  entities: Entity[]
) {
  // Build a lookup map for quick entity reference
  const entityMap = new Map<string, Entity>();
  entities.forEach(entity => {
    entityMap.set(entity.address, entity);
    
    // Also map related addresses
    if (entity.relatedAddresses) {
      entity.relatedAddresses.forEach(addr => {
        if (!entityMap.has(addr)) {
          entityMap.set(addr, entity);
        }
      });
    }
  });
  
  // Enrich each cluster
  clusters.forEach(cluster => {
    // Add entity information for each account
    const knownEntities = new Map<string, {
      name: string,
      type: string,
      verified: boolean,
      accounts: Set<string>
    }>();
    
    cluster.accounts.forEach(account => {
      const entity = entityMap.get(account);
      if (entity) {
        // Track entity information
        if (!knownEntities.has(entity.name)) {
          knownEntities.set(entity.name, {
            name: entity.name,
            type: entity.type,
            verified: entity.verified,
            accounts: new Set([account])
          });
        } else {
          knownEntities.get(entity.name).accounts.add(account);
        }
      }
    });
    
    // Add known entities to the cluster
    if (knownEntities.size > 0) {
      cluster.entities = Array.from(knownEntities.values()).map(e => ({
        name: e.name,
        type: e.type,
        verified: e.verified,
        accounts: Array.from(e.accounts)
      }));
    }
  });
  
  return clusters;
}

// Get cluster stats for dashboard display
export function getClusteringStats(clusters: TransactionCluster[]) {
  // Initialize stats
  const stats = {
    totalClusters: clusters.length,
    totalAccounts: new Set<string>(),
    totalTransactions: 0,
    clustersByType: {} as Record<string, number>,
    totalValue: 0,
    largestCluster: {
      id: '',
      accounts: 0,
      transactions: 0
    }
  };
  
  // Process each cluster
  clusters.forEach(cluster => {
    // Track unique accounts
    cluster.accounts.forEach(account => stats.totalAccounts.add(account));
    
    // Track transaction count
    stats.totalTransactions += cluster.transactions.length;
    
    // Track total value
    stats.totalValue += cluster.totalValue;
    
    // Track cluster types
    const type = cluster.type || 'Unknown';
    stats.clustersByType[type] = (stats.clustersByType[type] || 0) + 1;
    
    // Track largest cluster
    if (cluster.accounts.length > stats.largestCluster.accounts) {
      stats.largestCluster.id = cluster.id;
      stats.largestCluster.accounts = cluster.accounts.length;
      stats.largestCluster.transactions = cluster.transactions.length;
    }
  });
  
  return {
    ...stats,
    totalAccounts: stats.totalAccounts.size
  };
}